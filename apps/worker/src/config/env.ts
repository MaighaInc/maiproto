import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string(),
  AI_PROVIDER: z.enum(['openai', 'claude', 'gemini']).default('openai'),
  AI_API_KEY: z.string(),
  OCR_PROVIDER: z.enum(['textract', 'documentai', 'formrecognizer']).default('textract'),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  GCP_PROJECT_ID: z.string().optional(),
  DOCUMENTAI_PROCESSOR_ID: z.string().optional(),
  DOCUMENTAI_LOCATION: z.string().optional(),
  AZURE_FORM_RECOGNIZER_ENDPOINT: z.string().optional(),
  AZURE_FORM_RECOGNIZER_KEY: z.string().optional(),
  STORAGE_PROVIDER: z.enum(['local', 's3', 'r2']).default('local'),
  S3_BUCKET: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  LOCAL_STORAGE_DIR: z.string().optional(),
  EMAIL_PROVIDER: z.enum(['smtp', 'sendgrid', 'resend']).default('smtp'),
  EMAIL_FROM_ADDRESS: z.string().email(),
  EMAIL_FROM_NAME: z.string().default('ReceiptFlow'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // Worker concurrency — tune per deployment size
  OCR_CONCURRENCY: z.coerce.number().int().positive().default(5),
  CATEGORIZATION_CONCURRENCY: z.coerce.number().int().positive().default(10),
  NOTIFICATION_CONCURRENCY: z.coerce.number().int().positive().default(20),
  JOURNAL_CONCURRENCY: z.coerce.number().int().positive().default(10),
  WEBHOOK_CONCURRENCY: z.coerce.number().int().positive().default(25),

  // Webhook delivery config
  WEBHOOK_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  WEBHOOK_BACKOFF_BASE_MS: z.coerce.number().int().positive().default(1_000),
  WEBHOOK_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  WEBHOOK_MAX_RESPONSE_BODY_BYTES: z.coerce.number().int().positive().default(4_096),
});

export type WorkerEnv = z.infer<typeof envSchema>;

let _config: WorkerEnv | null = null;

export function getConfig(): WorkerEnv {
  if (_config) return _config;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Worker environment validation failed:', result.error.format());
    process.exit(1);
  }
  _config = result.data;
  return _config;
}

