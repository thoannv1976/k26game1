/** Runtime configuration from environment variables (see .env.example). */
export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  projectId: string;
  vertexLocation: string;
  geminiModel: string | null; // overrides tenant aiConfig.model when set
  aiProvider: 'vertex' | 'fake';
  speechProvider: 'google' | 'fake';
  ttsProvider: 'google' | 'fake';
  blobStore: 'gcs' | 'local' | 'memory';
  audioBucket: string;
  localDataDir: string;
  sttModel: string;
  sttLanguage: string;
  aiTimeoutMs: number;
  aiMaxRetries: number;
  logLevel: string;
  corsOrigins: string[];
}

function str(name: string, def: string): string {
  const v = process.env[name];
  return v === undefined || v === '' ? def : v;
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const env = (str('NODE_ENV', 'development') as AppConfig['env']) ?? 'development';
  const projectId = str('GCP_PROJECT_ID', str('GOOGLE_CLOUD_PROJECT', str('GCLOUD_PROJECT', 'demo-ecs')));
  const prod = env === 'production';
  const cfg: AppConfig = {
    env,
    port: Number(str('PORT', '8080')),
    projectId,
    vertexLocation: str('VERTEX_LOCATION', 'asia-southeast1'),
    geminiModel: process.env.GEMINI_MODEL || null,
    aiProvider: str('AI_PROVIDER', prod ? 'vertex' : 'fake') as AppConfig['aiProvider'],
    speechProvider: str('SPEECH_PROVIDER', prod ? 'google' : 'fake') as AppConfig['speechProvider'],
    ttsProvider: str('TTS_PROVIDER', prod ? 'google' : 'fake') as AppConfig['ttsProvider'],
    blobStore: str('BLOB_STORE', prod ? 'gcs' : 'local') as AppConfig['blobStore'],
    audioBucket: str('AUDIO_BUCKET', `${projectId}-audio`),
    localDataDir: str('LOCAL_DATA_DIR', '.data'),
    sttModel: str('STT_MODEL', 'latest_long'),
    sttLanguage: str('STT_LANGUAGE', 'en-US'),
    aiTimeoutMs: Number(str('AI_TIMEOUT_MS', '15000')),
    aiMaxRetries: Number(str('AI_MAX_RETRIES', '2')),
    logLevel: str('LOG_LEVEL', prod ? 'info' : 'debug'),
    corsOrigins: str('CORS_ORIGINS', '').split(',').filter(Boolean),
    ...overrides,
  };
  assertSafeConfig(cfg);
  return cfg;
}

/** Offline (fake) providers exist for development and tests only. */
export function assertSafeConfig(cfg: AppConfig): void {
  if (cfg.env !== 'production') return;
  const bad: string[] = [];
  if (cfg.aiProvider !== 'vertex') bad.push('AI_PROVIDER');
  if (cfg.speechProvider !== 'google') bad.push('SPEECH_PROVIDER');
  if (cfg.ttsProvider !== 'google') bad.push('TTS_PROVIDER');
  if (cfg.blobStore !== 'gcs') bad.push('BLOB_STORE');
  if (bad.length) {
    throw new Error(`Refusing to start in production with offline providers: ${bad.join(', ')}`);
  }
}
