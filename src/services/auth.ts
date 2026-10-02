import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export { onAuthStateChanged };

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  return cred.user;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Firebase Auth UIDs allowed to use the CMS and the scanner.
 * Mirrors the ADMIN_UIDS list in firestore.rules - keep both in sync.
 */
export const ADMIN_UIDS = [
  'jX9wljERWsgpJtRB1NyeFl1fnWv1',
];

/**
 * True when the signed-in user is on the admin allowlist. This mirrors the
 * isAdmin() check in firestore.rules, which is what actually enforces access.
 */
export function isAdminUser(user: User | null = auth.currentUser): boolean {
  return !!user && ADMIN_UIDS.includes(user.uid);
}
