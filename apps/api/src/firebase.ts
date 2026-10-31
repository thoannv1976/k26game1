import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App | undefined;

/** Initializes Firebase Admin. On Cloud Run it uses the service account (ADC); locally the emulators. */
export function firebaseApp(projectId: string): App {
  if (!app) app = getApps()[0] ?? initializeApp({ projectId });
  return app;
}

export function firestore(projectId: string): Firestore {
  const db = getFirestore(firebaseApp(projectId));
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    /* settings already applied */
  }
  return db;
}

export function adminAuth(projectId: string) {
  return getAuth(firebaseApp(projectId));
}
