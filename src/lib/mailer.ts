import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendWelcomeEmail(to: string, name: string) {
  // No-op when SMTP isn't configured — keeps signup fast and error-free.
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }

  const firstName = name.split(' ')[0];

  const text = `Hey ${firstName}!

Welcome to Hoot-Hoot — the place to sharpen your aptitude for Capgemini and Cognizant placements.

You're all set. Jump in and start playing:
https://hoot-hoot.com/games/cognitive

If you enjoy it, a GitHub star means the world — Hoot-Hoot is fully open source:
https://github.com/yashbodade/HootHoot

Stay updated with new games and features:
X (Twitter)  → https://x.com/yashbodade
LinkedIn     → https://www.linkedin.com/in/yashbodade/

Good luck on your placement!

— Yash
Hoot-Hoot · hoot-hoot.com`;

  await transporter.sendMail({
    from: `"Hoot-Hoot" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Welcome to Hoot-Hoot!',
    text,
  });
}
