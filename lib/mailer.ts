// Sends the 6-digit code for a sign-up or a password reset.
//
// Set SMTP_URL to any SMTP server, for example:
//   Gmail (with an app password):  smtps://you%40gmail.com:APP_PASSWORD@smtp.gmail.com:465
//   Resend:                        smtps://resend:RESEND_API_KEY@smtp.resend.com:465
//   Brevo:                         smtp://LOGIN:SMTP_KEY@smtp-relay.brevo.com:587
// and MAIL_FROM to the sender, e.g. "Offscreen <you@gmail.com>".
//
// With no SMTP_URL, local development prints the code to the server console instead.
import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

import { IS_SERVERLESS } from './store';

let transport: Transporter | undefined;
function getTransport() {
  if (!canSendEmail()) return null;
  transport ||= nodemailer.createTransport(process.env.SMTP_URL!);
  return transport;
}

export const canSendEmail = () => {
  const url = process.env.SMTP_URL;
  if (!url) return false;
  if (url.includes('APP_PASSWORD') || url.includes('RESEND_API_KEY') || url.includes('SMTP_KEY') || url.includes('you%40gmail.com')) {
    return false;
  }
  return true;
};

export async function sendCode({ to, code, purpose }: { to: string; code: string; purpose: 'signup' | 'reset' }) {
  const t = getTransport();
  const action = purpose === 'signup' ? 'finish creating your account' : 'set your new password';
  if (!t) {
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
    if (!IS_SERVERLESS) {
      console.warn(`\n[dev] Sending email via SMTP failed (${(err as Error).message}). Falling back to console:`);
      console.log(`[dev] Offscreen code for ${to}: ${code}\n`);
      return;
    }
    throw err;
  }
}
