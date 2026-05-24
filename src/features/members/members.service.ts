import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { getDb } from '../../lib/firebase/db';
import type { Member } from '../../types';

const COLLECTION = 'member';

function docToMember(docSnap: QueryDocumentSnapshot<DocumentData>): Member {
  const data = docSnap.data();
  const toDate = (value: unknown): Date => {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date();
  };

  return {
    id: docSnap.id,
    email: data.Email ?? data.email ?? '',
    name: data.Name ?? data.name ?? '',
    roleId: data.Role ?? data.roleId ?? 'guest',
    status: data.Status ?? data.status ?? 'inactive',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function fetchMembers(): Promise<Member[]> {
  const db = getDb();
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(docToMember);
}

export async function fetchMemberByEmail(email: string): Promise<Member | null> {
  const db = getDb();
  const snapshot = await getDocs(collection(db, COLLECTION));
  const normalizedEmail = email.trim().toLowerCase();
  const match = snapshot.docs
    .map(docToMember)
    .find((member) => member.email.trim().toLowerCase() === normalizedEmail);
  return match ?? null;
}

export async function syncMemberFromAuth(data: {
  email: string;
  name?: string;
  roleId?: string;
}): Promise<string> {
  const db = getDb();
  const existing = await fetchMemberByEmail(data.email);
  if (existing) {
    await updateDoc(doc(db, COLLECTION, existing.id), {
      name: data.name ?? existing.name,
      roleId: data.roleId ?? existing.roleId,
      updatedAt: serverTimestamp(),
    });
    return existing.id;
  }
  const docRef = await addDoc(collection(db, COLLECTION), {
    email: data.email,
    name: data.name ?? data.email,
    roleId: data.roleId ?? 'guest',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function createMember(data: {
  email: string;
  name: string;
  roleId: string;
  status: string;
}): Promise<string> {
  const db = getDb();
  const docRef = await addDoc(collection(db, COLLECTION), {
    Email: data.email,
    Name: data.name,
    Role: data.roleId,
    Status: data.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateMember(email: string, data: { name?: string; roleId?: string; status?: string }): Promise<void> {
  const db = getDb();
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.Name = data.name;
  if (data.roleId !== undefined) updateData.Role = data.roleId;
  if (data.status !== undefined) updateData.Status = data.status;
  updateData.updatedAt = serverTimestamp();
  await updateDoc(doc(db, COLLECTION, email), updateData);
}

export async function deleteMember(email: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTION, email));
}
