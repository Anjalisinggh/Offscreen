// Sends the 6-digit code for a sign-up or a password reset.
//
// Set SMTP_URL to any SMTP server, for example:
//   Gmail (with an app password):  smtps://you%40gmail.com:APP_PASSWORD@smtp.gmail.com:465
//   Resend:                        smtps://resend:RESEND_API_KEY@smtp.resend.com:465
//   Brevo:                         smtp://LOGIN:SMTP_KEY@smtp-relay.brevo.com:587
// and MAIL_FROM to the sender, e.g. "Offscreen <you@gmail.com>".
//
// With no SMTP_URL in local development, prints the code to the server console instead.
import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

const PLACEHOLDER_PATTERNS = [
  'APP_PASSWORD',
  'YOUR_PASSWORD',
  'RESEND_API_KEY',
  'SMTP_KEY',
  'YOU%40GMAIL.COM',
  'YOU@GMAIL.COM',
  'CHANGE_ME',
  'CHANGE-ME',
];

export function isLocalDev(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return false;
  if (process.env.CI) return false;
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

export function sanitizeErrorMessage(msg: string): string {
  if (!msg) return '';
  return msg.replace(/:([^@/:\s]+)@/g, ':***@');
}

export const canSendEmail = (): boolean => {
  const raw = process.env.SMTP_URL?.trim();
  if (!raw) return false;

  const upper = raw.toUpperCase();
  for (const placeholder of PLACEHOLDER_PATTERNS) {
    if (upper.includes(placeholder)) return false;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'smtp:' && parsed.protocol !== 'smtps:') return false;
    if (!parsed.hostname) return false;
  } catch {
    return false;
  }

  return true;
};

let transport: Transporter | undefined;
let cachedSmtpUrl: string | undefined;

export function getTransport(): Transporter | null {
  if (!canSendEmail()) {
    transport = undefined;
    cachedSmtpUrl = undefined;
    return null;
  }

  const currentUrl = process.env.SMTP_URL!.trim();
  if (!transport || cachedSmtpUrl !== currentUrl) {
    transport = nodemailer.createTransport(currentUrl);
    cachedSmtpUrl = currentUrl;
  }

  return transport;
}

export async function sendCode({ to, code, purpose }: { to: string; code: string; purpose: 'signup' | 'reset' }) {
  const t = getTransport();
  const action = purpose === 'signup' ? 'finish creating your account' : 'set your new password';

  if (!t) {
    if (!isLocalDev()) {
      throw new Error("Sign-in email service is not configured on this server");
    }
    console.log(`\n[dev] Offscreen code for ${to}: ${code}  (set SMTP_URL to send real emails)\n`);
    return;
  }

  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_FROM || 'Offscreen <no-reply@offscreen.app>',
      to,
      subject: `${code} is your Offscreen code`,
      text: `Your Offscreen code is ${code}\n\nEnter it to ${action}. It expires in 10 minutes.\nIf you didn't ask for this, you can ignore this email.`,
      html: `<div style="font-family:Georgia,serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#3b1f2c">
        <p style="font-size:22px;margin:0 0 4px"><em style="color:#c25a7c">Off</em>screen</p>
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#86666f;margin:0 0 28px">A collection for your screen.</p>
        <p style="font-family:Arial,sans-serif;font-size:15px;margin:0 0 14px">Enter this code to ${action}:</p>
        <p style="font-family:'Courier New',monospace;font-size:34px;letter-spacing:10px;font-weight:bold;margin:0 0 24px;color:#8e3456">${code}</p>
        <p style="font-family:Arial,sans-serif;font-size:13px;color:#86666f;margin:0">It expires in 10 minutes. If you didn't ask for this, you can ignore this email.</p>
      </div>`,
    });
  } catch (err) {
    if (isLocalDev()) {
      console.warn(`\n[dev] Sending email via SMTP failed (${sanitizeErrorMessage((err as Error).message)}). Falling back to console:`);
      console.log(`[dev] Offscreen code for ${to}: ${code}\n`);
      return;
    }
    throw err;
  }
}
