/**
 * Email templates for ReceiptFlow AI transactional emails.
 * All templates return { subject, html, text }.
 */

export interface TemplateOutput {
  subject: string;
  html: string;
  text: string;
}

const BASE_URL = process.env['APP_URL'] ?? 'https://app.receiptflow.ai';

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <h2 style="color:#6366f1;">ReceiptFlow AI</h2>
  ${body}
  <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb;">
  <p style="font-size:12px;color:#6b7280;">© ${new Date().getFullYear()} ReceiptFlow AI. All rights reserved.</p>
</body>
</html>`;
}

export function verifyEmailTemplate(params: { name: string; token: string }): TemplateOutput {
  const link = `${BASE_URL}/auth/verify-email?token=${encodeURIComponent(params.token)}`;
  return {
    subject: 'Verify your ReceiptFlow AI email address',
    html: layout(
      'Verify Email',
      `<p>Hi ${escapeHtml(params.name)},</p>
       <p>Click the button below to verify your email address. The link expires in 24 hours.</p>
       <p><a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Verify Email</a></p>
       <p>If you didn't create a ReceiptFlow account, ignore this email.</p>`,
    ),
    text: `Hi ${params.name},\n\nVerify your email: ${link}\n\nLink expires in 24 hours.`,
  };
}

export function resetPasswordTemplate(params: { name: string; token: string }): TemplateOutput {
  const link = `${BASE_URL}/auth/reset-password?token=${encodeURIComponent(params.token)}`;
  return {
    subject: 'Reset your ReceiptFlow AI password',
    html: layout(
      'Reset Password',
      `<p>Hi ${escapeHtml(params.name)},</p>
       <p>Click the button below to reset your password. This link expires in 1 hour.</p>
       <p><a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>
       <p>If you didn't request a password reset, you can ignore this email. Your password won't change.</p>`,
    ),
    text: `Hi ${params.name},\n\nReset your password: ${link}\n\nLink expires in 1 hour.`,
  };
}

export function receiptApprovalRequestTemplate(params: {
  approverName: string;
  submitterName: string;
  receiptId: string;
  amount: string;
  vendor: string;
}): TemplateOutput {
  const link = `${BASE_URL}/approvals/${encodeURIComponent(params.receiptId)}`;
  return {
    subject: `Approval requested: ${params.vendor} ${params.amount}`,
    html: layout(
      'Approval Request',
      `<p>Hi ${escapeHtml(params.approverName)},</p>
       <p>${escapeHtml(params.submitterName)} has submitted a receipt for your approval:</p>
       <table style="border-collapse:collapse;width:100%;margin:16px 0;">
         <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Vendor</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(params.vendor)}</td></tr>
         <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Amount</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(params.amount)}</td></tr>
       </table>
       <p><a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Review Receipt</a></p>`,
    ),
    text: `Hi ${params.approverName},\n\n${params.submitterName} submitted a receipt for approval.\nVendor: ${params.vendor}\nAmount: ${params.amount}\n\nReview: ${link}`,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
