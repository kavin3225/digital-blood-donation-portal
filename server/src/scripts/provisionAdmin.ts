import { connectDB, closeDB } from '../config/db';
import { ENV } from '../config/env';
import { StudentRegistration } from '../models/StudentRegistration';

const main = async () => {
  const emailFlag = process.argv.indexOf('--email');
  const email = String(emailFlag >= 0 ? process.argv[emailFlag + 1] : process.argv[2] || '').toLowerCase().trim();
  if (!email || !ENV.INITIAL_ADMIN_EMAILS.includes(email) || !/^[^@\s]+@bitsathy\.ac\.in$/.test(email)) {
    throw new Error('Pass an exact @bitsathy.ac.in email already present in INITIAL_ADMIN_EMAILS.');
  }
  await connectDB();
  const existing = await StudentRegistration.findOne({ googleEmail: email });
  // This private setup command provisions allowlisted admin identity. It does
  // not replace a password that may already have been set through the private
  // password setup command.
  await StudentRegistration.findOneAndUpdate(
    { googleEmail: email },
    {
      $set: {
        googleEmail: email,
        collegeEmail: email,
        name: existing?.name || 'Portal Administrator',
        userType: 'Staff',
        registerNumber: existing?.registerNumber || 'PORTAL-ADMIN',
        department: existing?.department || 'Administration',
        year: 'N/A',
        selectedRole: 'Both',
        portalRole: 'Both',
        systemRole: 'admin',
        status: 'active',
        syncStatus: 'synced',
        isProfileComplete: existing?.isProfileComplete || false,
      },
      $unset: { adminLoginTokenHash: 1, adminLoginTokenExpiresAt: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
  console.log(`Passwordless administrator account provisioned for ${email}. Sign-in requires a single-use link sent to this allowlisted mailbox.`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Admin provisioning failed.');
  process.exitCode = 1;
}).finally(async () => {
  await closeDB();
});
