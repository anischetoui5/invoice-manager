const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `EASYfact <${process.env.RESEND_FROM ?? 'onboarding@resend.dev'}>`;

async function sendVerificationCode(toEmail, code) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: 'Your EASYfact verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1d4ed8">Verify your email</h2>
        <p>Enter this code to complete your registration:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1d4ed8;margin:24px 0">${code}</div>
        <p style="color:#6b7280;font-size:14px">This code expires in 15 minutes. If you didn't create an EASYfact account, ignore this email.</p>
      </div>
    `,
  });
}

async function sendPasswordResetCode(toEmail, code) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: 'Reset your EASYfact password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1d4ed8">Reset your password</h2>
        <p>Enter this code to reset your password:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1d4ed8;margin:24px 0">${code}</div>
        <p style="color:#6b7280;font-size:14px">This code expires in 15 minutes. If you didn't request a password reset, ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationCode, sendPasswordResetCode };
