// Sends the 6-digit code for a sign-up or a password reset.
//
// Two ways to send, whichever is set:
//   RESEND_API_KEY  Resend's HTTP API (https://resend.com). Works everywhere, including Cloudflare
//                   Workers, which can't use SMTP.
//   SMTP_URL        any SMTP server, for example:
//     Gmail (with an app password):  smtps://you%40gmail.com:APP_PASSWORD@smtp.gmail.com:465
//     Resend:                        smtps://resend:RESEND_API_KEY@smtp.resend.com:465
//     Brevo:                         smtp://LOGIN:SMTP_KEY@smtp-relay.brevo.com:587
// and MAIL_FROM to the sender, e.g. "Offscreen <you@gmail.com>" (with Resend, an address on a
// domain verified there).
//
// With neither, local development prints the code to the server console instead.
import 'server-only';
import type { Transporter } from 'nodemailer';

let transport: Transporter | undefined;
async function getTransport() {
  const nodemailer = (await import('nodemailer')).default;
  transport ||= nodemailer.createTransport(process.env.SMTP_URL);
  return transport;
}

export const canSendEmail = () => !!(process.env.RESEND_API_KEY || process.env.SMTP_URL);

export async function sendCode({ to, code, purpose }: { to: string; code: string; purpose: 'signup' | 'reset' }) {
  const action = purpose === 'signup' ? 'finish creating your account' : 'set your new password';
  if (!canSendEmail()) {
    console.log(`\n[dev] Offscreen code for ${to}: ${code}  (set RESEND_API_KEY or SMTP_URL to send real emails)\n`);
    return;
  }
  const mail = {
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
  };
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(mail),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }
  await (await getTransport()).sendMail(mail);
}
