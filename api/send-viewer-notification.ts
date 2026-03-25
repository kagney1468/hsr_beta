import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

type Body = {
  to: string[];
  subject: string;
  html: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { to, subject, html } = (req.body || {}) as Partial<Body>;

  if (!Array.isArray(to) || to.length === 0) {
    // Treat missing recipients as non-fatal (e.g. if seller email isn't present)
    res.status(200).json({ ok: true, skipped: true, reason: 'No recipients' });
    return;
  }

  if (!subject || !html) {
    res.status(400).json({ error: 'Missing subject or html' });
    return;
  }

  const host = process.env.RESEND_SMTP_HOST || 'smtp.resend.com';
  const port = process.env.RESEND_SMTP_PORT ? Number(process.env.RESEND_SMTP_PORT) : 465;
  const user = process.env.RESEND_SMTP_USER || 'resend';
  const pass = process.env.RESEND_SMTP_PASS;
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM;

  if (!pass || !from) {
    res.status(500).json({ error: 'Email server not configured' });
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    res.status(200).json({ ok: true, id: info.messageId });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Send failed' });
  }
}

