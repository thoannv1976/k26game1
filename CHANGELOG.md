# Changelog

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
