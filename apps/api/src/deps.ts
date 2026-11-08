import type { Auth } from 'firebase-admin/auth';
import type { JWTVerifyGetKey } from 'jose';
import type { Firestore } from 'firebase-admin/firestore';
import type { AiProvider } from './ai/types.js';
import { FakeAiProvider } from './ai/fake.js';
import { VertexAiProvider } from './ai/vertex.js';
import { GcsBlobStore, LocalBlobStore, MemoryBlobStore, type BlobStore } from './blob.js';
import type { AppConfig } from './config.js';
import type { ServiceTokenVerifier } from './serviceAuth.js';
import { adminAuth, firestore } from './firebase.js';
import { FakeSpeechToText, GoogleSpeechToText, type SpeechToText } from './speech/stt.js';
import { FakeTextToSpeech, GoogleTextToSpeech, type TextToSpeech } from './speech/tts.js';

export interface Deps {
  config: AppConfig;
  db: Firestore;
  auth: Auth;
  ai: AiProvider;
  stt: SpeechToText;
  tts: TextToSpeech;
  blobs: BlobStore;
  now: () => Date;
  /** Test hook: verifies Google service ID tokens (default: Google public keys). */
  serviceTokenVerifier?: ServiceTokenVerifier;
  /** Test hooks for the UniGame Hub adapter (default: Hub JWKS over HTTPS / global fetch). */
  ltiJwks?: JWTVerifyGetKey;
  ltiFetch?: typeof fetch;
}

export function createDeps(config: AppConfig, overrides: Partial<Deps> = {}): Deps {
  return {
    config,
    db: overrides.db ?? firestore(config.projectId),
    auth: overrides.auth ?? adminAuth(config.projectId),
    ai: overrides.ai ?? (config.aiProvider === 'vertex' ? new VertexAiProvider(config.projectId, config.vertexLocation) : new FakeAiProvider()),
    stt: overrides.stt ?? (config.speechProvider === 'google' ? new GoogleSpeechToText(config.sttModel, config.sttLanguage) : new FakeSpeechToText()),
    tts: overrides.tts ?? (config.ttsProvider === 'google' ? new GoogleTextToSpeech() : new FakeTextToSpeech()),
    blobs:
      overrides.blobs ??
      (config.blobStore === 'gcs'
        ? new GcsBlobStore(config.audioBucket)
        : config.blobStore === 'local'
          ? new LocalBlobStore(config.localDataDir)
          : new MemoryBlobStore()),
    now: overrides.now ?? (() => new Date()),
    serviceTokenVerifier: overrides.serviceTokenVerifier,
    ltiJwks: overrides.ltiJwks,
    ltiFetch: overrides.ltiFetch,
  };
}
