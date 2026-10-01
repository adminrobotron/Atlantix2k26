import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChanged } from '../services/auth';
import { auth } from '../firebase';
import { getUserProfile, createUserProfile } from '../services/userProfile';
import { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let profile = await getUserProfile(firebaseUser.uid);
        if (!profile) {
          profile = await createUserProfile(firebaseUser);
        }
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profile = await getUserProfile(user.uid);
    if (profile) setUserProfile(profile);
  }, [user]);

  return { user, userProfile, loading, refreshProfile };
}
