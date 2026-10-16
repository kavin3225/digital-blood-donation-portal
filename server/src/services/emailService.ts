import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

const getTransport = () => {
  if (!ENV.SMTP_HOST || !ENV.SMTP_USER || !ENV.SMTP_PASS) {
    const error: any = new Error('Email verification is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM on the server.');
    error.statusCode = 503;
    throw error;
  }
  return nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE || ENV.SMTP_PORT === 465,
    auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS },
  });
};

const sendLink = async (email: string, subject: string, heading: string, purpose: string, url: string, expiresInMinutes = 30) => {
  const transport = getTransport();
  await transport.sendMail({
    from: ENV.EMAIL_FROM,
    to: email,
    subject,
    text: `${heading}\n\n${purpose}\n\n${url}\n\nThe link expires in ${expiresInMinutes} minutes. If you did not request this, ignore this email.`,
    html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#172033"><p style="color:#9f1239;font-weight:bold">DIGITAL BLOOD DONATION PORTAL</p><h1 style="font-size:24px">${heading}</h1><p style="line-height:1.6">${purpose}</p><p style="margin:28px 0"><a href="${url}" style="background:#9f1239;color:#fff;padding:13px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Continue securely</a></p><p style="font-size:12px;color:#64748b">The link expires in ${expiresInMinutes} minutes. If you did not request this, ignore this email.</p></main>`,
  });
};

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const url = `${ENV.FRONTEND_URL}/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  await sendLink(email, 'Verify your Digital Blood Donation Portal account', 'Verify your college email', 'Confirm this email address to activate your portal account.', url);
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  const url = `${ENV.FRONTEND_URL}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  await sendLink(email, 'Reset your Digital Blood Donation Portal password', 'Reset your password', 'Use this one-time link to choose a new password for your account.', url);
};

export const sendAdminLoginEmail = async (email: string, token: string): Promise<void> => {
  const url = `${ENV.FRONTEND_URL}/admin/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  await sendLink(email, 'Your administrator sign-in link', 'Sign in to the administrator portal', 'Use this one-time link to sign in. It can only be used once.', url, 15);
};
