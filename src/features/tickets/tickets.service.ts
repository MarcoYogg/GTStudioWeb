import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { getDb } from '../../lib/firebase/db';
import type { Ticket, TicketComment, TicketStatus } from '../../types';

const TICKETS_COLLECTION = 'tickets';
const COMMENTS_COLLECTION = 'ticketComments';

function docToTicket(docSnap: QueryDocumentSnapshot<DocumentData>): Ticket {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    type: data.type ?? 'bug',
    title: data.title ?? '',
    description: data.description ?? '',
    status: data.status ?? 'open',
    priority: data.priority ?? 'medium',
    createdBy: data.createdBy ?? '',
    submittedBy: data.submittedBy ?? data.createdBy ?? '',
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function fetchTickets(): Promise<Ticket[]> {
  const db = getDb();
  const q = query(collection(db, TICKETS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToTicket);
}

export async function fetchTicketsByStatus(status: TicketStatus): Promise<Ticket[]> {
  const db = getDb();
  const q = query(collection(db, TICKETS_COLLECTION), where('status', '==', status), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToTicket);
}

export async function createTicket(data: {
  type: string;
  title: string;
  description: string;
  priority: string;
  createdBy: string;
  submittedBy: string;
}): Promise<string> {
  const db = getDb();
  const docRef = await addDoc(collection(db, TICKETS_COLLECTION), {
    ...data,
    status: 'open',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, TICKETS_COLLECTION, id), { status });
}

export async function deleteTicket(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, TICKETS_COLLECTION, id));
}

function docToComment(docSnap: QueryDocumentSnapshot<DocumentData>): TicketComment {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ticketId: data.ticketId ?? '',
    author: data.author ?? '',
    authorEmail: data.authorEmail ?? '',
    content: data.content ?? '',
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function fetchCommentsByTicket(ticketId: string): Promise<TicketComment[]> {
  const db = getDb();
  const q = query(collection(db, COMMENTS_COLLECTION), where('ticketId', '==', ticketId), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToComment);
}

export async function addComment(data: {
  ticketId: string;
  author: string;
  authorEmail: string;
  content: string;
}): Promise<string> {
  const db = getDb();
  const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
