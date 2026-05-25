const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER ?? 'easyfact.app@gmail.com',
    pass: process.env.BREVO_SMTP_KEY,
  },
});

const FROM = `EasyFact <${process.env.BREVO_FROM ?? 'easyfact.app@gmail.com'}>`;

async function sendVerificationCode(toEmail, code) {
  await transporter.sendMail({
    from: FROM,
    to: toEmail,
    subject: 'Your EasyFact verification code',
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
  await transporter.sendMail({
    from: FROM,
    to: toEmail,
    subject: 'Reset your EasyFact password',
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
