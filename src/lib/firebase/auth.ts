import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirebaseApp } from './client';
import type { AuthUser } from '../../types';

const provider = new GoogleAuthProvider();

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

/** Trigger Google sign-in popup. Returns the Firebase User on success. */
export async function loginWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function logout(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

/** Convert raw Firebase User to our AuthUser shape */
export function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

/** Subscribe to auth state changes. Returns unsubscribe fn. */
export function onAuthChange(cb: (user: AuthUser | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, (user) => {
    cb(toAuthUser(user));
  });
}