/**
 * Grants (or revokes) the `admin: true` Firebase Auth custom claim that
 * firestore.rules uses to gate siteContent writes and registration reads.
 *
 * Requires a service account with the
 *   "Firebase Authentication Admin" role
 * on project atlantix2k26.
 *
 * Setup:
 *   1. Firebase console -> Project settings -> Service accounts ->
 *      Generate new private key. Save it outside the repo, e.g.
 *      C:\Users\<you>\secrets\atlantix2k26-admin.json
 *   2. Point GOOGLE_APPLICATION_CREDENTIALS at it, or set
 *      FIREBASE_SERVICE_ACCOUNT to the file path.
 *   3. The account must already exist in Firebase Auth
 *      (console -> Authentication -> Users), then:
 *
 *   npm run set-admin -- you@example.com
 *   npm run set-admin -- you@example.com --revoke
 *
 * Users must sign out and back in (or refresh the token) for the claim to
 * take effect.
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'atlantix2k26';

function loadServiceAccount(): string {
  const explicit = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (explicit) {
    if (!existsSync(explicit)) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT points at a missing file: ${explicit}`);
    }
    return resolve(explicit);
  }
  const fromGoogle = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fromGoogle && existsSync(fromGoogle)) {
    return resolve(fromGoogle);
  }
  throw new Error(
    'No service account configured.\n' +
      'Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS to the\n' +
      'path of a service account JSON key for project ' +
      PROJECT_ID +
      '.'
  );
}

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes('--revoke');
  const email = args.find((a) => !a.startsWith('--'));
  if (!email) {
    console.error('Usage: npm run set-admin -- <admin-email> [--revoke]');
    process.exit(1);
  }

  const keyPath = loadServiceAccount();
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id || PROJECT_ID,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
    });

  const auth = getAuth(app);
  const user = await auth.getUserByEmail(email);
  const claim = { admin: !revoke };

  await auth.setCustomUserClaims(user.uid, claim);

  console.log(
    `${revoke ? 'Revoked' : 'Granted'} admin claim for ${email} (uid ${user.uid}).\n` +
      'They must sign out and sign back in for it to take effect.'
  );
}

main().catch((err) => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
