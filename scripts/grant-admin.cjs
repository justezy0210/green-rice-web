/**
 * One-off script: grant Firebase custom claim `admin: true` to a user.
 *
 * Usage:
 *   node scripts/grant-admin.cjs <uid_or_email>
 *
 * Requirements:
 *   - Firebase service account JSON at $GOOGLE_APPLICATION_CREDENTIALS or
 *     `./service-account.json` in repo root (gitignored).
 *   - `npm i firebase-admin` (dev dep OK; this is a one-off).
 *
 * After running, the user must sign out and back in to refresh their ID token.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadCredentials() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.credential.applicationDefault();
  }
  const saPath = path.resolve(__dirname, '..', 'service-account.json');
  if (fs.existsSync(saPath)) {
    return admin.credential.cert(require(saPath));
  }
  throw new Error(
    'No credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or place service-account.json at repo root.',
  );
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node scripts/grant-admin.cjs <uid_or_email>');
    process.exit(1);
  }

  admin.initializeApp({ credential: loadCredentials() });

  let uid = arg;
  if (arg.includes('@')) {
    const user = await admin.auth().getUserByEmail(arg);
    uid = user.uid;
    console.log(`Resolved email ${arg} → uid ${uid}`);
  }

  const existing = (await admin.auth().getUser(uid)).customClaims || {};
  await admin.auth().setCustomUserClaims(uid, { ...existing, admin: true });
  console.log(`Granted admin claim to ${uid}. User must sign out + back in.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
