import { createAIProvider } from '@receiptflow/ai';
import { createOCRProvider } from '@receiptflow/ocr';
import { createStorageProvider } from '@receiptflow/storage';
import { createEmailProvider, createSlackProvider } from '@receiptflow/notifications';
import { JwtService } from '@receiptflow/auth/jwt';
import { EncryptionService } from '@receiptflow/auth/encryption';
import type { Env } from './env.js';

export interface Services {
  jwt: JwtService;
  encryption: EncryptionService;
  ai: ReturnType<typeof createAIProvider>;
  ocr: ReturnType<typeof createOCRProvider>;
  storage: ReturnType<typeof createStorageProvider>;
  email: ReturnType<typeof createEmailProvider>;
  slack?: ReturnType<typeof createSlackProvider>;
}

export function createServices(env: Env): Services {
  const jwt = new JwtService({
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRY,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRY,
  });

  const encryption = new EncryptionService(env.ENCRYPTION_KEY);

  const ai = createAIProvider({
    provider: env.AI_PROVIDER,
    ...(env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY
      ? { openai: { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL } }
      : {}),
    ...(env.AI_PROVIDER === 'claude' && env.ANTHROPIC_API_KEY
      ? { claude: { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL } }
      : {}),
    ...(env.AI_PROVIDER === 'gemini' && env.GOOGLE_AI_API_KEY
      ? { gemini: { apiKey: env.GOOGLE_AI_API_KEY, model: env.GEMINI_MODEL } }
      : {}),
  });

  const ocr = createOCRProvider({
    provider: env.OCR_PROVIDER,
    ...(env.OCR_PROVIDER === 'textract'
      ? {
          textract: {
            region: env.AWS_REGION ?? 'us-east-1',
            accessKeyId: env.AWS_ACCESS_KEY_ID ?? '',
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? '',
          },
        }
      : {}),
    ...(env.OCR_PROVIDER === 'documentai' &&
    env.DOCUMENTAI_PROJECT_ID &&
    env.DOCUMENTAI_LOCATION &&
    env.DOCUMENTAI_PROCESSOR_ID
      ? {
          documentAI: {
            projectId: env.DOCUMENTAI_PROJECT_ID,
            location: env.DOCUMENTAI_LOCATION,
            processorId: env.DOCUMENTAI_PROCESSOR_ID,
          },
        }
      : {}),
    ...(env.OCR_PROVIDER === 'formrecognizer' &&
    env.AZURE_FORM_RECOGNIZER_ENDPOINT &&
    env.AZURE_FORM_RECOGNIZER_KEY
      ? {
          formRecognizer: {
            endpoint: env.AZURE_FORM_RECOGNIZER_ENDPOINT,
            apiKey: env.AZURE_FORM_RECOGNIZER_KEY,
          },
        }
      : {}),
  });

  const storage = createStorageProvider({
    provider: env.STORAGE_PROVIDER,
    ...(env.STORAGE_PROVIDER === 'local'
      ? { local: { basePath: env.STORAGE_LOCAL_BASE_PATH ?? './uploads', baseUrl: `${env.API_URL}/uploads` } }
      : {}),
    ...(env.STORAGE_PROVIDER === 's3' &&
    env.AWS_ACCESS_KEY_ID &&
    env.AWS_SECRET_ACCESS_KEY &&
    env.AWS_REGION &&
    env.AWS_S3_BUCKET
      ? {
          s3: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            region: env.AWS_REGION,
            bucket: env.AWS_S3_BUCKET,
          },
        }
      : {}),
    ...(env.STORAGE_PROVIDER === 'r2' &&
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET
      ? {
          r2: {
            accountId: env.R2_ACCOUNT_ID,
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            bucket: env.R2_BUCKET,
          },
        }
      : {}),
  });

  const email = createEmailProvider({
    provider: env.EMAIL_PROVIDER,
    ...(env.EMAIL_PROVIDER === 'smtp' &&
    env.SMTP_HOST &&
    env.SMTP_PORT &&
    env.SMTP_USER &&
    env.SMTP_PASSWORD
      ? {
          smtp: {
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE ?? false,
            user: env.SMTP_USER,
            password: env.SMTP_PASSWORD,
          },
        }
      : {}),
    ...(env.EMAIL_PROVIDER === 'sendgrid' && env.SENDGRID_API_KEY
      ? { sendgrid: { apiKey: env.SENDGRID_API_KEY } }
      : {}),
    ...(env.EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY
      ? { resend: { apiKey: env.RESEND_API_KEY } }
      : {}),
  });

  const slack = env.SLACK_WEBHOOK_URL
    ? createSlackProvider({ webhookUrl: env.SLACK_WEBHOOK_URL })
    : undefined;

  return { jwt, encryption, ai, ocr, storage, email, ...(slack ? { slack } : {}) };
}
