// Sends the 6-digit sign-in code.
//
// Set SMTP_URL to any SMTP server, for example:
//   Gmail (with an app password):  smtps://you%40gmail.com:APP_PASSWORD@smtp.gmail.com:465
//   Resend:                        smtps://resend:RESEND_API_KEY@smtp.resend.com:465
//   Brevo:                         smtp://LOGIN:SMTP_KEY@smtp-relay.brevo.com:587
// and MAIL_FROM to the sender, e.g. "Offscreen <you@gmail.com>".
//
// With no SMTP_URL, local development prints the code to the server console instead.

let transport;
function getTransport() {
  if (!process.env.SMTP_URL) return null;
  transport ||= require('nodemailer').createTransport(process.env.SMTP_URL);
  return transport;
}

const canSendEmail = () => !!process.env.SMTP_URL;

async function sendCode({ to, code, purpose }) {
  const t = getTransport();
  const action = purpose === 'signup' ? 'finish creating your account' : 'log in';
  if (!t) {
    console.log(`\n[dev] Offscreen code for ${to}: ${code}  (set SMTP_URL to send real emails)\n`);
    return;
  }
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
}

module.exports = { sendCode, canSendEmail };
