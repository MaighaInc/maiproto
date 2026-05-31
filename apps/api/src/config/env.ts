import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Encryption
  ENCRYPTION_KEY: z.string().length(64), // 32-byte hex key

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3', 'r2']).default('local'),
  STORAGE_LOCAL_BASE_PATH: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),

  // AI
  AI_PROVIDER: z.enum(['openai', 'claude', 'gemini']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-pro'),

  // OCR
  OCR_PROVIDER: z.enum(['textract', 'documentai', 'formrecognizer']).default('textract'),
  DOCUMENTAI_PROJECT_ID: z.string().optional(),
  DOCUMENTAI_LOCATION: z.string().optional(),
  DOCUMENTAI_PROCESSOR_ID: z.string().optional(),
  AZURE_FORM_RECOGNIZER_ENDPOINT: z.string().optional(),
  AZURE_FORM_RECOGNIZER_KEY: z.string().optional(),

  // Email
  EMAIL_PROVIDER: z.enum(['smtp', 'sendgrid', 'resend']).default('smtp'),
  EMAIL_FROM_ADDRESS: z.string().email().default('noreply@receiptflow.ai'),
  EMAIL_FROM_NAME: z.string().default('ReceiptFlow AI'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.string().transform((v) => v === 'true').optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // Slack
  SLACK_WEBHOOK_URL: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_API_VERSION: z.string().default('2024-06-20'),
  STRIPE_PRICE_GROWTH: z.string().optional(),
  STRIPE_PRICE_PROFESSIONAL: z.string().optional(),
  STRIPE_PRICE_FIRM: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(500),

  // HTTP body / timeout
  BODY_SIZE_LIMIT: z.string().default('10mb'),
  SERVER_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().positive().default(65_000),

  // OCR job queue config
  OCR_JOB_ATTEMPTS: z.coerce.number().int().positive().default(3),
  OCR_JOB_BACKOFF_DELAY_MS: z.coerce.number().int().positive().default(5_000),

  // App
  APP_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:3001'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

let _config: Env;

export function getConfig(): Env {
  if (!_config) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const errors = result.error.errors.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n');
      console.error(`[Config] Invalid environment variables:\n${errors}`);
      process.exit(1);
    }
    _config = result.data;
  }
  return _config;
}
