import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';

const APP_NAME = 'ReceiptFlow AI';

// Configure strict TOTP settings
authenticator.options = {
  window: 1,   // allow ±1 time step tolerance
  step: 30,    // 30-second time step
  digits: 6,
};

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

/**
 * Generate MFA setup for a user (TOTP-based).
 */
export async function generateMfaSetup(
  userEmail: string,
  tenantName: string,
): Promise<MfaSetupResult> {
  const secret = authenticator.generateSecret(20);
  const issuer = `${APP_NAME} (${tenantName})`;
  const otpauthUrl = authenticator.keyuri(userEmail, issuer, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
  });
  const backupCodes = generateBackupCodes(8);

  return { secret, otpauthUrl, qrCodeDataUrl, backupCodes };
}

/**
 * Verify a TOTP code against a stored secret.
 */
export function verifyMfaToken(token: string, secret: string): boolean {
  return authenticator.verify({ token: token.replace(/\s/g, ''), secret });
}

/**
 * Generate one-time backup codes.
 * Returns plaintext codes (caller must store hashed versions).
 */
export function generateBackupCodes(count: number): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex').toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}
