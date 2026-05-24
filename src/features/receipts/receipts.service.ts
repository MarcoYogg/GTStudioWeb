import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getDb } from '../../lib/firebase/db';
import { getFirebaseStorage } from '../../lib/firebase/storage';
import type { Receipt, ReceiptStatus } from '../../types';

const COLLECTION = 'receipts';

function docToReceipt(docSnap: QueryDocumentSnapshot<DocumentData>): Receipt {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title ?? '',
    amount: data.amount ?? 0,
    currency: data.currency ?? 'HKD',
    note: data.note ?? '',
    fileUrl: data.fileUrl ?? '',
    fileType: data.fileType ?? (data.fileUrl?.match(/\.pdf$/i) ? 'pdf' : 'image'),
    uploadedById: data.uploadedById ?? data.uploadedByEmail ?? '',
    uploadedByName: data.uploadedByName ?? data.uploadedBy ?? '',
    status: data.status ?? 'pending',
    rejectionNote: data.rejectionNote,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? data.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function uploadReceiptFile(file: File, userEmail: string): Promise<string> {
  const storage = getFirebaseStorage();
  const filePath = `receipts/${userEmail}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, filePath);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function createReceipt(data: {
  title: string;
  amount: number;
  note?: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  uploadedById: string;
  uploadedByName: string;
}): Promise<string> {
  const db = getDb();
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function fetchReceipts(): Promise<Receipt[]> {
  const db = getDb();
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToReceipt);
}

export async function fetchReceiptsByStatus(status: ReceiptStatus): Promise<Receipt[]> {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where('status', '==', status), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToReceipt);
}

export async function approveReceipt(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    status: 'approved',
    updatedAt: serverTimestamp(),
  });
}

export async function rejectReceipt(id: string, rejectionNote: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    status: 'rejected',
    rejectionNote,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteReceipt(id: string): Promise<void> {
  const db = getDb();
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  if (snapshot.exists()) {
    const data = snapshot.data();
    if (data.fileUrl) {
      try {
        const storage = getFirebaseStorage();
        await deleteObject(ref(storage, data.fileUrl));
      } catch (e) {
        console.warn('Could not delete receipt file:', e);
      }
    }
  }
  await deleteDoc(doc(db, COLLECTION, id));
}
