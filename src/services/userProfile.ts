import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { UserProfile } from '../types';

export async function createUserProfile(user: User): Promise<UserProfile> {
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL,
    phone: '',
    branch: '',
    college: '',
    department: '',
    year: '',
    dob: '',
    diet: '',
    profileCompleted: false,
    teamId: null,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };
  await setDoc(doc(db, 'users', user.uid), profile);
  return profile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  await setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.profileCompleted) return true;
  return (
    !!profile.dob &&
    !!profile.diet &&
    !!profile.year &&
    !!profile.department &&
    !!profile.phone &&
    !!profile.college
  );
}
