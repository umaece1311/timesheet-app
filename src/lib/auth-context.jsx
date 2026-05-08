import { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  onAuthStateChanged,
  ensureUserDoc,
  subscribeToUserDoc
} from './firebase';

const AuthCtx = createContext({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isApproved: false,
  status: null
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      // Tear down any previous profile subscription on user change.
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      setUser(u);
      if (u) {
        await ensureUserDoc(u);
        // Live updates so the app reacts the moment the admin approves/denies.
        unsubProfile = subscribeToUserDoc(u.uid, (p) => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubProfile) unsubProfile();
      unsubAuth();
    };
  }, []);

  const isAdmin = profile?.role === 'admin';
  const status = profile?.status || null;
  const isApproved = status === 'approved';

  return (
    <AuthCtx.Provider value={{ user, profile, loading, isAdmin, isApproved, status }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
