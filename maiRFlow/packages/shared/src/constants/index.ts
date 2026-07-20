// ─── Subscription limits ─────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: 'Starter',
    receiptLimit: 100,
    storageGbLimit: 5,
    userLimit: 3,
    organizationLimit: 1,
    priceMonthly: 29,
    priceYearly: 290,
  },
  GROWTH: {
    name: 'Growth',
    receiptLimit: 500,
    storageGbLimit: 20,
    userLimit: 10,
    organizationLimit: 2,
    priceMonthly: 79,
    priceYearly: 790,
  },
  PROFESSIONAL: {
    name: 'Professional',
    receiptLimit: 5000,
    storageGbLimit: 100,
    userLimit: 25,
    organizationLimit: 5,
    priceMonthly: 199,
    priceYearly: 1990,
  },
  FIRM: {
    name: 'Firm',
    receiptLimit: 50000,
    storageGbLimit: 1000,
    userLimit: 200,
    organizationLimit: 50,
    priceMonthly: 799,
    priceYearly: 7990,
  },
} as const;

// ─── Receipt pipeline events ─────────────────────────────────────────────────

export const RECEIPT_EVENTS = {
  UPLOADED: 'receipt.uploaded',
  OCR_STARTED: 'receipt.ocr.started',
  OCR_COMPLETED: 'receipt.ocr.completed',
  AI_STARTED: 'receipt.ai.started',
  AI_COMPLETED: 'receipt.ai.completed',
  CATEGORIZED: 'receipt.categorized',
  ACCOUNTING_MAPPED: 'receipt.accounting.mapped',
  PROCESSED: 'receipt.processed',
  DUPLICATE_DETECTED: 'receipt.duplicate_detected',
  APPROVAL_NEEDED: 'receipt.approval_needed',
} as const;

// ─── Queue names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  OCR: 'ocr',
  AI_EXTRACTION: 'ai-extraction',
  CATEGORIZATION: 'categorization',
  ACCOUNTING: 'accounting',
  JOURNAL: 'journal',
  NOTIFICATIONS: 'notifications',
  WEBHOOKS: 'webhooks',
  WEBHOOK_DELIVERY: 'webhook-delivery',
  REPORTS: 'reports',
  RECONCILIATION: 'reconciliation',
} as const;

// ─── Cache TTLs (seconds) ────────────────────────────────────────────────────

export const CACHE_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  VERY_LONG: 86400,    // 24 hours
  WEEK: 604800,        // 7 days
} as const;

// ─── Supported file types ────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'application/pdf',
] as const;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_FILES_PER_UPLOAD = 20;
export const MAX_PAGES_PER_PDF = 100;

// ─── Default expense categories ──────────────────────────────────────────────

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Meals & Entertainment',
  'Travel',
  'Fuel',
  'Office Supplies',
  'Marketing',
  'Software',
  'Insurance',
  'Payroll',
  'Professional Services',
  'Utilities',
  'Miscellaneous',
] as const;

// ─── Supported currencies ────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'MXN',
  'BRL', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'NZD', 'ZAR', 'AED', 'SAR',
] as const;
