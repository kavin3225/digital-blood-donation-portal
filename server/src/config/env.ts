import dotenv from 'dotenv';
import path from 'path';

// Load from server/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleClientIdFormatValid = /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(googleClientId);

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173',
  ALLOWED_COLLEGE_DOMAIN: (process.env.ALLOWED_COLLEGE_DOMAIN || 'bitsathy.ac.in').toLowerCase().trim(),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bit_blood_portal',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_key_bit_blood_portal_super_secure_random_hash_2026_jwt',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  GOOGLE_CLIENT_ID: googleClientId,
  GOOGLE_CLIENT_ID_FORMAT_VALID: googleClientIdFormatValid,
  FORM_SYNC_SECRET: process.env.FORM_SYNC_SECRET || 'test_hmac_secret_for_bit_apps_script_sync_12345',
  GOOGLE_FORM_URL: process.env.GOOGLE_FORM_URL || 'https://docs.google.com/forms/d/e/1FAIpQLSc_BIT_BLOOD_REGISTRATION_PORTAL/viewform',
  EMAIL_OTP_FALLBACK_ENABLED: process.env.EMAIL_OTP_FALLBACK_ENABLED === 'true',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '"BIT Blood Coordination Desk" <blood-desk@bitsathy.ac.in>',
  PUBLIC_API_URL: process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000',
  WEB_PUSH_VAPID_PUBLIC_KEY: process.env.WEB_PUSH_VAPID_PUBLIC_KEY || '',
  WEB_PUSH_VAPID_PRIVATE_KEY: process.env.WEB_PUSH_VAPID_PRIVATE_KEY || '',
  WEB_PUSH_SUBJECT: process.env.WEB_PUSH_SUBJECT || 'mailto:portal-admin@bitsathy.ac.in',
  AVAILABILITY_STALE_DAYS: parseInt(process.env.AVAILABILITY_STALE_DAYS || '30', 10),
  INITIAL_ADMIN_EMAILS: (process.env.INITIAL_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean),
  INITIAL_COORDINATOR_EMAILS: (process.env.INITIAL_COORDINATOR_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean),
};
