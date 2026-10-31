#!/usr/bin/env bash
# Manual deployment (Cloud Shell / Claude Cowork). GitHub Actions does the same on push to main.
#   bash scripts/deploy.sh            # deploy API + web + rules/indexes to PROJECT_ID
# Requires: gcloud (logged in), node 22, npm. Reads web config from apps/web/.env.production.
# Env: PROJECT_ID (default k26game1), REGION (default asia-southeast1), GEMINI_MODEL (default gemini-2.5-flash),
#      MIN_INSTANCES (default 0), MAX_INSTANCES (default 10)
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_ID="${PROJECT_ID:-k26game1}"
REGION="${REGION:-asia-southeast1}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"
TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%s)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/ecs/ecs-api:${TAG}"
RUNTIME_SA="ecs-api@${PROJECT_ID}.iam.gserviceaccount.com"

if [[ ! -f apps/web/.env.production ]]; then
  echo "Missing apps/web/.env.production (copy apps/web/.env.example and fill the Firebase web config)." >&2
  exit 1
fi

echo "==> Installing dependencies"
npm ci --no-audit --no-fund

echo "==> Tests (unit)"
npm run test:unit

echo "==> Building API image ${IMAGE} with Cloud Build"
gcloud builds submit --project "${PROJECT_ID}" --config infrastructure/cloudbuild.api.yaml --substitutions "_IMAGE=${IMAGE}" .

echo "==> Deploying Cloud Run service ecs-api"
gcloud run deploy ecs-api --project "${PROJECT_ID}" --region "${REGION}" --image "${IMAGE}" \
  --service-account "${RUNTIME_SA}" --allow-unauthenticated \
  --memory 1Gi --cpu 1 --concurrency 40 --timeout 120 \
  --min-instances "${MIN_INSTANCES:-0}" --max-instances "${MAX_INSTANCES:-10}" \
  --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=${PROJECT_ID},VERTEX_LOCATION=${VERTEX_LOCATION:-${REGION}},AUDIO_BUCKET=${PROJECT_ID}-audio,GEMINI_MODEL=${GEMINI_MODEL},LOG_LEVEL=info"

# Firebase Hosting calls Cloud Run without a Google identity, so the service must accept public requests
# (the API checks Firebase ID tokens itself). Organisations with "Domain restricted sharing" block allUsers;
# in that case turn off the Cloud Run invoker IAM check instead.
RUN_URL="$(gcloud run services describe ecs-api --project "${PROJECT_ID}" --region "${REGION}" --format='value(status.url)')"
if [[ "$(curl -s -o /dev/null -w '%{http_code}' "${RUN_URL}/api/health")" == "403" ]]; then
  echo "==> Public access blocked by IAM policy – disabling the Cloud Run invoker IAM check"
  gcloud run services update ecs-api --project "${PROJECT_ID}" --region "${REGION}" --no-invoker-iam-check
fi
curl -fsS "${RUN_URL}/api/health" && echo

echo "==> Building web app"
npm run build --workspace @ecs/web

echo "==> Deploying Firebase Hosting, Firestore rules and indexes"
npx firebase hosting:sites:get "${PROJECT_ID}" --project "${PROJECT_ID}" >/dev/null 2>&1 || \
  npx firebase hosting:sites:create "${PROJECT_ID}" --project "${PROJECT_ID}" --non-interactive
npx firebase deploy --project "${PROJECT_ID}" --only hosting,firestore:rules,firestore:indexes --non-interactive

echo "==> Smoke test"
URL="https://${PROJECT_ID}.web.app"
curl -fsS "${URL}/api/health" && echo && echo "Deployed: ${URL}"
