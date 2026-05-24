import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { setPermissionOverrides } from '../../lib/permissions/can';
import { getDb } from '../../lib/firebase/db';
import type { PermissionKey } from '../../types';

const CONFIG_COLLECTION = 'config';
const PERMISSIONS_DOC = 'permissions';

/** Fetch custom permission overrides from Firestore and apply them */
export async function loadPermissionOverrides(): Promise<void> {
  const db = getDb();
  const snap = await getDoc(doc(db, CONFIG_COLLECTION, PERMISSIONS_DOC));
  if (snap.exists()) {
    setPermissionOverrides(snap.data() as Record<string, Partial<Record<PermissionKey, boolean>>>);
  }
}

/** Save custom permission overrides to Firestore */
export async function savePermissionOverrides(
  overrides: Record<string, Partial<Record<PermissionKey, boolean>>>
): Promise<void> {
  const db = getDb();
  await setDoc(doc(db, CONFIG_COLLECTION, PERMISSIONS_DOC), {
    ...overrides,
    updatedAt: serverTimestamp(),
  });
  setPermissionOverrides(overrides);
}