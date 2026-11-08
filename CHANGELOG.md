# Changelog

## 1.3.0 – unreleased (branch feature/lti-sso)

### Added
- UniGame Hub (LTI 1.3) single sign-on from Moodle, off unless `LTI_ENABLED=true`.
  - `POST /api/lti/launch {ticket}` verifies the Hub's one-time signed ticket and creates or reuses an `lti-…` Auth user. These users are keyed by the Hub user id, never by e-mail, so existing accounts are untouched.
  - It sets the claims `{tenantId, role}` and enrols the user in the course mapped from the Moodle course.
  - It creates the assignment for the mission the teacher chose and returns a Firebase custom token.
  - Web page `/lti-launch` signs in with that token and opens the mission (students) or the class page (teachers).
- Grade sync to Moodle through the Hub. After `complete` and after a teacher review, the final percent is sent for sessions of LTI assignments. Every outcome is logged in `tenants/{t}/lti_outbox`, and a failure never blocks the request.
- Config: `LTI_ENABLED`, `LTI_HUB_URL`, `LTI_GAME_ID`, `LTI_TENANT_MAP` (`hubTenant=appTenant;…`), and `LTI_GAME_SECRET` (Secret Manager `unigamehub-secret`).
- `scripts/lti-preview.sh` with `firebase.preview.json` deploys a preview (separate Cloud Run service and Hosting channel).

### Changed
- Resuming an unfinished session from an assignment link now attaches that assignment to the session.

## 1.2.0 – 2026-11-01

### Added
- `GET /api/lms/v1/learners/:uid/evidence`: one learner's evidence (k26-evidence-1.0). Besides school admins, the
  VSTEP Quest (Game 3) service account may call it read-only with a Google ID token (audience `k26-lms`) and the
  `X-K26-Tenant` header, so Game 3 can show a four-skill profile across the K26 games. Allowed accounts:
  `LMS_SERVICE_ACCOUNTS` (deploy default `vstep-api@<project>.iam.gserviceaccount.com`; empty = disabled).

## 1.1.0 – 2026-11-01

### Changed
- Accounts are shared with English Detective (Game 2) in the same Firebase project: a user whose claims point to a school
  that exists here gets a profile automatically on first visit; schools that are not set up here get a clear message.
- LMS API now returns the common K26 learning-evidence format `k26-evidence-1.0` (same as English Detective).

## 1.0.1 – 2026-10-31

### Fixed
- Gemini 3.x Flash models (e.g. `gemini-3-flash-preview`, the Flash model available to k26game1 after `gemini-2.5-flash` returned 404) now get an explicit thinking budget. Default thinking used up `maxOutputTokens`, truncating the JSON reply so every turn fell back to "Sorry, could you repeat that".

## 1.0.0 – 2026-10-31

First complete version of English City Simulator (Game 1).

### Added
- City map with 3 open locations (Airport, Restaurant & Café, University) and 3 "coming soon" (Hotel, Office, Shopping Mall).
- Six missions M01–M06 (B1/B2) with stages, objectives, controlled twists, hints and sample dialogue.
- Voice conversation with AI characters: browser WAV recording → Speech-to-Text → Gemini (Vertex AI) → Text-to-Speech (cached).
- Scenario Engine: deterministic stages/objectives/completion; AI evidence must quote the student's own words.
- Text fallback mode (not counted as speaking evidence), hints, replays, pause/resume, resume after interruption.
- Assessment: 100-point rubric (task completion by engine, comprehension/grammar/vocabulary by AI, fluency from speech timing only when enough audio data), learning recommendations, XP and achievements.
- Student, Teacher, School Admin and Platform dashboards; teacher review/adjustment of AI scores; CSV export.
- Multi-tenant Firestore model, Firebase Auth custom claims, Firestore rules (deny all client writes), audit logs.
- AI cost control: per-student daily calls, attempts per mission, school/course monthly budgets, usage logs and reports.
- LMS-AI9 integration API (`/api/lms/v1`) with a standard learning-evidence format.
- Deployment: Dockerfile (Cloud Run), Firebase Hosting rewrite, bootstrap script, GitHub Actions with Workload Identity Federation.
- Tests: unit, integration and security-rules tests on Firebase emulators, end-to-end tests with Playwright.
