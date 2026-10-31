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

echo "==> Building web app"
npm run build --workspace @ecs/web

echo "==> Deploying Firebase Hosting, Firestore rules and indexes"
npx firebase deploy --project "${PROJECT_ID}" --only hosting,firestore:rules,firestore:indexes --non-interactive

echo "==> Smoke test"
URL="https://${PROJECT_ID}.web.app"
curl -fsS "${URL}/api/health" && echo && echo "Deployed: ${URL}"
