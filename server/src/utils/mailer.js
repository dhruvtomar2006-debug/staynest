import nodemailer from 'nodemailer';

let transporter;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.error('Failed to create Ethereal test account:', err.message);
    }
  }

  return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transport = await getTransporter();
    if (!transport) return;

    const info = await transport.sendMail({
      from: '"StayNest" <no-reply@staynest.dev>',
      to,
      subject,
      html,
    });

    if (info && info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    // Non-blocking catch to ensure API response is never broken
    console.error('Failed to send email to %s:', to, error.message);
  }
};
