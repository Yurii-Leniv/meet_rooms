import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config.js';

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let etherealTransporter: Transporter | null = null;

/** Lazily create a throwaway Ethereal test inbox for local development. */
async function getEtherealTransporter(): Promise<Transporter> {
  if (etherealTransporter) return etherealTransporter;
  const account = await nodemailer.createTestAccount();
  etherealTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: account.user, pass: account.pass },
  });
  console.log('📧 Using Ethereal test inbox (no RESEND_API_KEY set).');
  return etherealTransporter;
}

/** Send via Resend's HTTP API. */
async function sendViaResend(mail: MailInput): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.mail.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.mail.from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend API error ${res.status}: ${detail}`);
  }
}

/**
 * Sends an email. Uses Resend in production (when RESEND_API_KEY is set) and an
 * Ethereal test inbox otherwise. No-ops during tests.
 */
export async function sendMail(mail: MailInput): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;

  try {
    if (config.mail.resendApiKey) {
      await sendViaResend(mail);
      console.log(`📧 Sent "${mail.subject}" to ${mail.to} via Resend`);
      return;
    }

    const transporter = await getEtherealTransporter();
    const info = await transporter.sendMail({ from: config.mail.from, ...mail });
    const preview = nodemailer.getTestMessageUrl(info);
    console.log(`📧 Sent "${mail.subject}" to ${mail.to}`);
    if (preview) console.log(`   Preview: ${preview}`);
  } catch (err) {
    // Email must never break the request flow — just log it.
    console.error('📧 Failed to send email:', err);
  }
}
