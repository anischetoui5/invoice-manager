const API_KEY  = process.env.BREVO_SMTP_KEY;
const FROM_EMAIL = process.env.BREVO_FROM ?? 'easyfact.app@gmail.com';
const FROM_NAME  = 'EasyFact';

async function sendMail(to, subject, html) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sender:      { name: FROM_NAME, email: FROM_EMAIL },
      to:          [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
}

async function sendVerificationCode(toEmail, code) {
  await sendMail(
    toEmail,
    'Your EasyFact verification code',
    `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1d4ed8">Verify your email</h2>
        <p>Enter this code to complete your registration:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1d4ed8;margin:24px 0">${code}</div>
        <p style="color:#6b7280;font-size:14px">This code expires in 15 minutes. If you didn't create an EASYfact account, ignore this email.</p>
      </div>
    `
  );
}

async function sendPasswordResetCode(toEmail, code) {
  await sendMail(
    toEmail,
    'Reset your EasyFact password',
    `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1d4ed8">Reset your password</h2>
        <p>Enter this code to reset your password:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1d4ed8;margin:24px 0">${code}</div>
        <p style="color:#6b7280;font-size:14px">This code expires in 15 minutes. If you didn't request a password reset, ignore this email.</p>
      </div>
    `
  );
}

module.exports = { sendVerificationCode, sendPasswordResetCode };
