#!/usr/bin/env bash
# One-time Google Cloud setup for English City Simulator.
# Run in Cloud Shell (or any shell logged in as a project Owner):
#   bash infrastructure/bootstrap.sh
# Optional env vars:
#   PROJECT_ID (default k26game1)  REGION (default asia-southeast1)
#   GITHUB_REPO (default thoannv1976/k26game1)  AUDIO_RETENTION_DAYS (default 30)
#   BILLING_ACCOUNT (e.g. 0123AB-4567CD-89EF01) + BUDGET_USD (default 50) to create a budget alert
# The script is idempotent: re-running it skips resources that already exist.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-k26game1}"
REGION="${REGION:-asia-southeast1}"
GITHUB_REPO="${GITHUB_REPO:-thoannv1976/k26game1}"
AUDIO_RETENTION_DAYS="${AUDIO_RETENTION_DAYS:-30}"
BUDGET_USD="${BUDGET_USD:-50}"
AR_REPO="ecs"
BUCKET="${PROJECT_ID}-audio"
RUNTIME_SA="ecs-api"
DEPLOYER_SA="gh-deployer"
POOL="github"
PROVIDER="github-oidc"

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

say "Project ${PROJECT_ID}, region ${REGION}"
gcloud config set project "${PROJECT_ID}" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
RUNTIME_EMAIL="${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOYER_EMAIL="${DEPLOYER_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

say "Enabling APIs (takes 1-2 minutes)"
gcloud services enable \
  run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  firestore.googleapis.com firebase.googleapis.com firebasehosting.googleapis.com firebaserules.googleapis.com \
  identitytoolkit.googleapis.com aiplatform.googleapis.com speech.googleapis.com texttospeech.googleapis.com \
  secretmanager.googleapis.com storage.googleapis.com iam.googleapis.com iamcredentials.googleapis.com \
  sts.googleapis.com cloudresourcemanager.googleapis.com serviceusage.googleapis.com logging.googleapis.com \
  billingbudgets.googleapis.com

say "Firestore (Native mode, ${REGION})"
if gcloud firestore databases describe --database='(default)' >/dev/null 2>&1; then
  echo "Firestore database already exists: $(gcloud firestore databases describe --database='(default)' --format='value(locationId)')"
else
  gcloud firestore databases create --database='(default)' --location="${REGION}" --type=firestore-native
fi

say "Artifact Registry repository ${AR_REPO}"
gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "${AR_REPO}" --repository-format=docker --location="${REGION}" --description="English City Simulator images"

say "Audio bucket gs://${BUCKET} (student audio auto-deleted after ${AUDIO_RETENTION_DAYS} days)"
gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1 || \
  gcloud storage buckets create "gs://${BUCKET}" --location="${REGION}" --uniform-bucket-level-access --public-access-prevention
LIFECYCLE="$(mktemp)"
cat > "${LIFECYCLE}" <<JSON
{"rule":[{"action":{"type":"Delete"},"condition":{"age":${AUDIO_RETENTION_DAYS},"matchesPrefix":["tenants/"]}}]}
JSON
gcloud storage buckets update "gs://${BUCKET}" --lifecycle-file="${LIFECYCLE}"
rm -f "${LIFECYCLE}"

say "Runtime service account ${RUNTIME_EMAIL}"
gcloud iam service-accounts describe "${RUNTIME_EMAIL}" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "${RUNTIME_SA}" --display-name="English City API (Cloud Run runtime)"
for role in roles/datastore.user roles/aiplatform.user roles/firebaseauth.admin roles/serviceusage.serviceUsageConsumer roles/logging.logWriter roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${RUNTIME_EMAIL}" --role="${role}" --condition=None >/dev/null
done
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" --member="serviceAccount:${RUNTIME_EMAIL}" --role=roles/storage.objectAdmin >/dev/null

say "Deployer service account ${DEPLOYER_EMAIL} (used by GitHub Actions and scripts/deploy.sh)"
gcloud iam service-accounts describe "${DEPLOYER_EMAIL}" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "${DEPLOYER_SA}" --display-name="GitHub Actions deployer"
for role in roles/run.admin roles/artifactregistry.writer roles/firebasehosting.admin roles/firebaserules.admin roles/datastore.indexAdmin roles/serviceusage.serviceUsageConsumer roles/firebase.viewer; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${DEPLOYER_EMAIL}" --role="${role}" --condition=None >/dev/null
done
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_EMAIL}" --member="serviceAccount:${DEPLOYER_EMAIL}" --role=roles/iam.serviceAccountUser >/dev/null

say "Cloud Build permissions (for 'gcloud builds submit' from Cloud Shell)"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
for role in roles/cloudbuild.builds.builder roles/artifactregistry.writer roles/logging.logWriter roles/storage.objectViewer; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${COMPUTE_SA}" --role="${role}" --condition=None >/dev/null 2>&1 || true
done

say "Workload Identity Federation for GitHub repo ${GITHUB_REPO}"
gcloud iam workload-identity-pools describe "${POOL}" --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create "${POOL}" --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers describe "${PROVIDER}" --location=global --workload-identity-pool="${POOL}" >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER}" --location=global --workload-identity-pool="${POOL}" \
    --display-name="GitHub OIDC" --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'"
gcloud iam service-accounts add-iam-policy-binding "${DEPLOYER_EMAIL}" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${GITHUB_REPO}" >/dev/null

if [[ -n "${BILLING_ACCOUNT:-}" ]]; then
  say "Budget alert ${BUDGET_USD} USD/month (alert only – it does not stop spending)"
  gcloud billing budgets create --billing-account="${BILLING_ACCOUNT}" --display-name="${PROJECT_ID} monthly" \
    --budget-amount="${BUDGET_USD}USD" --filter-projects="projects/${PROJECT_ID}" \
    --threshold-rule=percent=0.5 --threshold-rule=percent=0.8 --threshold-rule=percent=1.0 || echo "Budget creation skipped (check billing permissions)."
fi

WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
say "Done. Add these GitHub repository variables (Settings → Secrets and variables → Actions → Variables):"
cat <<OUT
  GCP_PROJECT_ID   = ${PROJECT_ID}
  GCP_REGION       = ${REGION}
  WIF_PROVIDER     = ${WIF_PROVIDER}
  DEPLOYER_SA      = ${DEPLOYER_EMAIL}
  RUNTIME_SA       = ${RUNTIME_EMAIL}
  AUDIO_BUCKET     = ${BUCKET}
  GEMINI_MODEL     = (a Gemini Flash model available in Vertex AI, e.g. gemini-2.5-flash)
  VITE_FIREBASE_API_KEY / VITE_FIREBASE_AUTH_DOMAIN / VITE_FIREBASE_APP_ID = from Firebase Console → Project settings → Web app
Manual steps that remain (Firebase Console):
  - Authentication → Sign-in method → enable Email/Password (and Google if wanted)
  - Authentication → Settings → Authorized domains: add your Hosting domain if you use a custom one
OUT
