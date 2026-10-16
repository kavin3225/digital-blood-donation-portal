import crypto from 'crypto';
import { emitKeypressEvents } from 'readline';
import { connectDB, closeDB } from '../config/db';
import { ENV } from '../config/env';
import { StudentRegistration } from '../models/StudentRegistration';

const readSecret = (): Promise<string> => new Promise((resolve, reject) => {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    reject(new Error('Run this command in an interactive terminal so the password is not echoed.'));
    return;
  }
  process.stdout.write('Enter the new admin password (10–128 characters): ');
  emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();
  let value = '';
  const finish = (error?: Error) => {
    input.setRawMode(false);
    input.pause();
    input.removeListener('keypress', onKeypress);
    process.stdout.write('\n');
    error ? reject(error) : resolve(value);
  };
  const onKeypress = (character: string, key: { name?: string; ctrl?: boolean }) => {
    if (key.ctrl && key.name === 'c') return finish(new Error('Cancelled.'));
    if (key.name === 'return' || key.name === 'enter') return finish();
    if (key.name === 'backspace') value = value.slice(0, -1);
    else if (character && !key.ctrl && character.length === 1) value += character;
  };
  input.on('keypress', onKeypress);
});

const main = async () => {
  const emailFlag = process.argv.indexOf('--email');
  const email = String(emailFlag >= 0 ? process.argv[emailFlag + 1] : '').toLowerCase().trim();
  if (!email || !ENV.INITIAL_ADMIN_EMAILS.includes(email) || !/^[^@\s]+@bitsathy\.ac\.in$/.test(email)) {
    throw new Error('Pass an exact @bitsathy.ac.in email already present in INITIAL_ADMIN_EMAILS.');
  }
  const password = await readSecret();
  if (password.length < 10 || password.length > 128) throw new Error('Admin passwords must be 10–128 characters.');

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
  await connectDB();
  const result = await StudentRegistration.updateOne(
    { googleEmail: email, systemRole: 'admin', status: 'active' },
    { $set: { passwordHash }, $unset: { adminLoginTokenHash: 1, adminLoginTokenExpiresAt: 1 } },
  );
  if (!result.matchedCount) throw new Error('No active, provisioned admin account matched this allowlisted email.');
  console.log(`Admin password updated for ${email}; only a scrypt hash was stored.`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Admin password update failed.');
  process.exitCode = 1;
}).finally(async () => {
  await closeDB();
});
