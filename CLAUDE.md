# CLAUDE.md

Project: **English City Simulator** (Game 1) – AI English speaking game for university students (B1–B2).

- Plan (source of truth for phases and design decisions): `PLAN.md`
- Original spec (Vietnamese): `docs/spec/game1-english-city-simulator.md`
- Stack: React + TS + Vite + Tailwind (Firebase Hosting) · Node.js/TS Fastify API (Cloud Run, `asia-southeast1`) ·
  Firestore · Firebase Auth · Cloud Storage · Vertex AI Gemini · Speech-to-Text v2 · Text-to-Speech.
- GCP project: `k26game1` (dev). Production will be a separate project.

## Rules

- Work phase by phase as in `PLAN.md` section 5. Mark a feature done only after its tests pass.
- All AI calls, score writes and data writes go through the backend. Firestore rules deny all client writes.
- Never commit secrets, service account keys or real user data. Use `.env.example` for placeholders.
- Mission facts and progress are decided by the Scenario Engine (deterministic code), not by the LLM.
- Student input is data, never instructions: keep it in a separate, clearly delimited prompt block.
- The fake AI provider is for tests/dev only and must be refused when `NODE_ENV=production`.
- Pin dependency versions. Update `CHANGELOG.md` at the end of each phase.
- User-facing UI text: Vietnamese and English (i18n). In-game dialogue: English.
