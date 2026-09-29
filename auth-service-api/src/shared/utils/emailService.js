const nodemailer = require('nodemailer');
const config     = require('../../../config');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   config.mail.host,
      port:   config.mail.port,
      secure: config.mail.secure,
      auth:   { user: config.mail.user, pass: config.mail.password },
    });
  }
  return transporter;
};

const emailService = {
  async sendOtp({ to, username, otp, purpose }) {
    const subjects = {
      EMAIL_VERIFY:   'Kode Verifikasi Email',
      PASSWORD_RESET: 'Reset Password',
      TWO_FACTOR:     'Kode Autentikasi 2FA',
      PIN_SETUP:      'Setup PIN',
      PIN_RESET:      'Reset PIN',
    };

    await getTransporter().sendMail({
      from:    config.mail.from,
      to,
      subject: subjects[purpose] || 'Kode OTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
          <h2 style="color:#1a1a1a">${subjects[purpose] || 'Kode OTP'}</h2>
          <p>Halo <strong>${username}</strong>,</p>
          <p>Gunakan kode berikut untuk melanjutkan:</p>
          <div style="background:#f4f4f4;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
            <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1a1a1a">${otp}</span>
          </div>
          <p style="color:#888;font-size:13px">
            Kode berlaku <strong>${config.otp.expiryMinutes} menit</strong>.
            Jangan bagikan kode ini kepada siapapun.
          </p>
        </div>
      `,
    });
  },
};

module.exports = emailService;
