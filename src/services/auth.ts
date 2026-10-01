import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  getIdTokenResult,
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
 * True when the signed-in user carries the `admin: true` custom claim set by
 * scripts/setAdminClaim.ts. This mirrors the isAdmin() check in firestore.rules.
 */
export async function isAdminUser(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const token = await getIdTokenResult(user, true);
  return token.claims.admin === true;
}
