/**
 * Emits a firestore.rules-style debug view of what a real team document looks
 * like, so the shape can be compared against the rule helpers by eye.
 * Run: npx tsx scripts/inspectShapes.ts
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function keyPath(): string {
  const p = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!p || !existsSync(p)) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT to a service account JSON key path.');
  }
  return resolve(p);
}

async function main() {
  const sa = JSON.parse(readFileSync(keyPath(), 'utf8'));
  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    });
  const db = getFirestore(app);

  const teams = await db.collection('teams').limit(2).get();
  const users = await db.collection('users').limit(3).get();
  const regs = await db.collection('registrations').limit(1).get();

  const summarise = (label: string, snap: any) => {
    console.log(`\n=== ${label} (${snap.size} docs) ===`);
    if (snap.empty) {
      console.log('(empty)');
      return;
    }
    snap.docs.forEach((d: any) => {
      const data = d.data();
      console.log(`\n[${label}] ${d.id}`);
      if (data.members) {
        console.log('  members[0] keys:', Object.keys(data.members[0] || {}).join(','));
      }
      if (data.leader) {
        console.log('  leader keys:', Object.keys(data.leader).join(','));
      }
      if (data.members && data.members[0]) {
        const m = data.members[0];
        const required = [
          'uid', 'displayName', 'email', 'phone', 'branch', 'college',
          'department', 'year', 'dob', 'diet', 'role', 'joinedAt',
        ];
        const missing = required.filter((k) => !(k in m));
        console.log('  members[0] missing required:', missing.length ? missing.join(',') : '(none)');
      }
      if (data.name !== undefined || data.registrationId !== undefined) {
        console.log('  registration keys:', Object.keys(data).join(','));
        if (data.members && data.members[0]) {
          const reqR = ['name','email','phone','branch','college','dob','year','diet','memberId','checkedIn'];
          const missR = reqR.filter((k) => !(k in data.members[0]));
          console.log('  reg members[0] missing required:', missR.length ? missR.join(',') : '(none)');
        }
      }
      if (data.profileCompleted !== undefined || data.diet !== undefined) {
        const reqU = ['uid','email','displayName','photoURL','phone','branch','college','department','year','dob','diet','profileCompleted','teamId','createdAt','updatedAt'];
        const missU = reqU.filter((k) => !(k in data));
        console.log('  user doc missing required:', missU.length ? missU.join(',') : '(none)');
        console.log('  profileCompleted:', data.profileCompleted, '| teamId:', data.teamId ?? null);
      }
    });
  };

  summarise('teams', teams);
  summarise('users', users);
  summarise('registrations', regs);
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
