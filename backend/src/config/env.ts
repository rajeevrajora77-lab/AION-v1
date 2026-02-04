import dotenv from 'dotenv';

let loaded = false;

export type RuntimeConfig = {
  port: number;
  isProduction: boolean;
  debug: boolean;
  frontendUrl: string;
  jwtSecret: string;
  openaiApiKey: string;
  mongodbUri?: string;
  http: { bodyLimit: string };
  rateLimit: { windowMs: number; max: number };
  shadow: { enabled: boolean; target: string };
};

let cfg: RuntimeConfig | null = null;

export function loadEnvOrFail(): void {
  if (!loaded) {
    dotenv.config();
    loaded = true;
  }

  const required = ['OPENAI_API_KEY', 'FRONTEND_URL', 'JWT_SECRET'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  cfg = {
    port: Number(process.env.PORT || 5000),
    isProduction: process.env.NODE_ENV === 'production',
    debug: process.env.DEBUG === 'true',
    frontendUrl: String(process.env.FRONTEND_URL),
    jwtSecret: String(process.env.JWT_SECRET),
    openaiApiKey: String(process.env.OPENAI_API_KEY),
    mongodbUri: process.env.MONGODB_URI,
    http: { bodyLimit: process.env.BODY_LIMIT || '10mb' },
    rateLimit: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
      max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
    },
    shadow: {
      enabled: process.env.SHADOW_ENABLED === 'true',
      target: process.env.SHADOW_TARGET || 'http://localhost:8000',
    },
  };
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!cfg) {
    throw new Error('Runtime config not loaded; call loadEnvOrFail() first');
  }
  return cfg;
}
