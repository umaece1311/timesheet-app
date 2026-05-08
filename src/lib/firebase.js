// Firebase initialization — Auth (Google) + Firestore.
// Values come from .env (see .env.example). Vite exposes any var prefixed with VITE_.
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

// ----- Admin email -----
// Only this Gmail can approve, deny, or revoke access for other users.
export const ADMIN_EMAIL = 'umaece1311@gmail.com';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOut() {
  return fbSignOut(auth);
}

export { onAuthStateChanged };

// ----- Firestore data shape -----
//   users/{uid}                          { email, displayName, photoURL, status, role, createdAt, lastLoginAt }
//     status: 'pending' | 'approved' | 'denied'
//     role:   'user' | 'admin'
//   users/{uid}/companies/{companyId}    { name, hourlyWage, createdAt }
//   users/{uid}/entries/{entryId}        { companyId, companyName, hourlyWage, date,
//                                          entryTime, exitTime, hours, pay, createdAt }

const userRoot = (uid) => doc(db, 'users', uid);
const usersRoot = () => collection(db, 'users');
const companiesRef = (uid) => collection(db, 'users', uid, 'companies');
const entriesRef = (uid) => collection(db, 'users', uid, 'entries');

/**
 * Called after sign-in. Creates the user doc if missing.
 *   - First-time admin login: status='approved', role='admin'.
 *   - Everyone else first-time:   status='pending',  role='user'.
 *   - On subsequent logins, only profile + lastLoginAt are updated;
 *     status and role are left alone (so admin's approve/deny stays intact).
 */
export async function ensureUserDoc(user) {
  if (!user) return;
  const ref = userRoot(user.uid);
  const snap = await getDoc(ref);
  const isAdmin = (user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const baseProfile = {
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    lastLoginAt: serverTimestamp()
  };
  if (!snap.exists()) {
    await setDoc(ref, {
      ...baseProfile,
      status: isAdmin ? 'approved' : 'pending',
      role: isAdmin ? 'admin' : 'user',
      createdAt: serverTimestamp()
    });
  } else {
    // Self-heal: if admin email signed in but doc says otherwise, fix it.
    const data = snap.data();
    const patch = { ...baseProfile };
    if (isAdmin && (data.role !== 'admin' || data.status !== 'approved')) {
      patch.role = 'admin';
      patch.status = 'approved';
    }
    await setDoc(ref, patch, { merge: true });
  }
}

/** Live-subscribe to the current user's profile doc. Returns an unsubscribe fn. */
export function subscribeToUserDoc(uid, onChange) {
  return onSnapshot(userRoot(uid), (snap) => {
    onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// ----- Admin-only helpers -----
export async function listAllUsers() {
  const snap = await getDocs(query(usersRoot(), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function setUserStatus(uid, status) {
  if (!['pending', 'approved', 'denied'].includes(status)) {
    throw new Error('Invalid status: ' + status);
  }
  return updateDoc(userRoot(uid), { status });
}

// ----- Company helpers -----
export async function listCompanies(uid) {
  const snap = await getDocs(query(companiesRef(uid), orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addCompany(uid, { name, hourlyWage }) {
  return addDoc(companiesRef(uid), {
    name: name.trim(),
    hourlyWage: Number(hourlyWage),
    createdAt: serverTimestamp()
  });
}

export async function updateCompany(uid, id, patch) {
  return updateDoc(doc(companiesRef(uid), id), patch);
}

export async function deleteCompany(uid, id) {
  return deleteDoc(doc(companiesRef(uid), id));
}

// ----- Entry helpers -----
export async function listEntries(uid, { startDate, endDate } = {}) {
  let q = query(entriesRef(uid), orderBy('date', 'desc'));
  if (startDate && endDate) {
    q = query(
      entriesRef(uid),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addEntry(uid, entry) {
  return addDoc(entriesRef(uid), { ...entry, createdAt: serverTimestamp() });
}

export async function updateEntry(uid, id, patch) {
  return updateDoc(doc(entriesRef(uid), id), patch);
}

export async function deleteEntry(uid, id) {
  return deleteDoc(doc(entriesRef(uid), id));
}

// ----- Pure helpers (UI-side math) -----
// Compute hours between "HH:MM" strings on the same date. Handles overnight shifts.
export function hoursBetween(entryTime, exitTime) {
  if (!entryTime || !exitTime) return 0;
  const [eh, em] = entryTime.split(':').map(Number);
  const [xh, xm] = exitTime.split(':').map(Number);
  let mins = xh * 60 + xm - (eh * 60 + em);
  if (mins < 0) mins += 24 * 60; // overnight
  return Math.round((mins / 60) * 100) / 100;
}

export function computePay(hours, hourlyWage) {
  return Math.round(hours * Number(hourlyWage || 0) * 100) / 100;
}
