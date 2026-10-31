import type { TFunction } from 'i18next';
import { ApiError } from '../api/client';

const KNOWN = new Set([
  'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_PROVISIONED', 'NOT_FOUND', 'VALIDATION', 'CONFLICT', 'TURN_IN_PROGRESS',
  'SESSION_NOT_ACTIVE', 'TURN_LIMIT', 'TIME_LIMIT', 'HINT_LIMIT', 'REPLAY_LIMIT', 'QUOTA_EXCEEDED', 'BUDGET_EXCEEDED',
  'ATTEMPT_LIMIT', 'AUDIO_UNCLEAR', 'AUDIO_TOO_LONG', 'CONSENT_REQUIRED', 'CONTENT_BLOCKED', 'INTERNAL', 'NETWORK',
]);

/** Localized, user-friendly message for an API (or any) error. */
export function errorMessage(t: TFunction, e: unknown): string {
  if (e instanceof ApiError) {
    if (KNOWN.has(e.code)) {
      // VALIDATION / CONFLICT / NOT_FOUND messages from the server are specific and useful – append them.
      const base = t(`errors.${e.code}` as 'errors.INTERNAL');
      if (['VALIDATION', 'CONFLICT', 'NOT_FOUND', 'FORBIDDEN'].includes(e.code) && e.message) return `${base} (${e.message})`;
      return base;
    }
    return e.message || t('errors.INTERNAL');
  }
  if (e instanceof Error && e.message) return e.message;
  return t('errors.INTERNAL');
}

/** Validation issue list from `details` ([{path, message}]). */
export function validationIssues(e: unknown): { path: string; message: string }[] {
  if (!(e instanceof ApiError) || !Array.isArray(e.details)) return [];
  return (e.details as unknown[])
    .map((d) => {
      const x = d as { path?: unknown; message?: unknown };
      const path = Array.isArray(x.path) ? x.path.join('.') : String(x.path ?? '');
      return { path, message: String(x.message ?? '') };
    })
    .filter((d) => d.message);
}
