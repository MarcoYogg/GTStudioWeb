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
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { getDb } from '../../lib/firebase/db';
import type { ScheduleEvent, AttendanceResponse, Rsvp, AttendanceResponseValue, RsvpStatus, Member } from '../../types';

const EVENTS_COLLECTION = 'events';
const ATTENDANCE_COLLECTION = 'scheduleResponses';
const RSVP_COLLECTION = 'rsvp';
const MEMBER_COLLECTION = 'member';

function docToEvent(docSnap: QueryDocumentSnapshot<DocumentData>): ScheduleEvent {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title ?? '',
    date: data.date ?? '',
    timeStart: data.timeStart ?? '',
    timeEnd: data.timeEnd ?? '',
    location: data.location ?? '',
    description: data.description ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? data.createdAt?.toDate?.() ?? new Date(),
  };
}

function docToAttendance(docSnap: QueryDocumentSnapshot<DocumentData>): AttendanceResponse {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    date: data.date ?? '',
    userEmail: data.userEmail ?? '',
    userName: data.userName ?? '',
    response: data.response ?? null,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

function docToRsvp(docSnap: QueryDocumentSnapshot<DocumentData>): Rsvp {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    eventId: data.eventId ?? '',
    userEmail: data.userEmail ?? '',
    status: data.status ?? 'going',
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

function docToMember(docSnap: QueryDocumentSnapshot<DocumentData>): Member {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    email: data.Email ?? data.email ?? '',
    name: data.Name ?? data.name ?? '',
    roleId: data.Role ?? data.roleId ?? 'guest',
    status: data.Status ?? data.status ?? 'inactive',
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

export async function fetchEvents(): Promise<ScheduleEvent[]> {
  const db = getDb();
  const snapshot = await getDocs(query(collection(db, EVENTS_COLLECTION), orderBy('date', 'asc')));
  return snapshot.docs.map(docToEvent);
}

export async function fetchEventsByDate(date: string): Promise<ScheduleEvent[]> {
  const db = getDb();
  const q = query(collection(db, EVENTS_COLLECTION), where('date', '==', date), orderBy('timeStart', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToEvent);
}

export async function createEvent(data: {
  title: string;
  date: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
  description?: string;
  createdBy: string;
}): Promise<string> {
  const db = getDb();
  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateEvent(
  id: string,
  data: {
    title: string;
    date: string;
    timeStart?: string;
    timeEnd?: string;
    location?: string;
    description?: string;
  }
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, EVENTS_COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEvent(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, EVENTS_COLLECTION, id));
}

export function subscribeEvents(onChange: (events: ScheduleEvent[]) => void): () => void {
  const db = getDb();
  return onSnapshot(query(collection(db, EVENTS_COLLECTION), orderBy('date', 'asc')), (snapshot) => {
    onChange(snapshot.docs.map(docToEvent));
  });
}

export function subscribeAttendance(onChange: (items: AttendanceResponse[]) => void): () => void {
  const db = getDb();
  return onSnapshot(collection(db, ATTENDANCE_COLLECTION), (snapshot) => {
    onChange(snapshot.docs.map(docToAttendance));
  });
}

export function subscribeRsvps(onChange: (items: Rsvp[]) => void): () => void {
  const db = getDb();
  return onSnapshot(collection(db, RSVP_COLLECTION), (snapshot) => {
    onChange(snapshot.docs.map(docToRsvp));
  });
}

export async function fetchAttendanceByDate(date: string): Promise<AttendanceResponse[]> {
  const db = getDb();
  const q = query(collection(db, ATTENDANCE_COLLECTION), where('date', '==', date), orderBy('userEmail', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToAttendance);
}

export async function upsertAttendance(data: {
  date: string;
  userEmail: string;
  userName: string;
  response: AttendanceResponseValue;
}): Promise<void> {
  const db = getDb();
  const existing = await getDocs(
    query(
      collection(db, ATTENDANCE_COLLECTION),
      where('date', '==', data.date),
      where('userEmail', '==', data.userEmail)
    )
  );

  if (existing.empty) {
    await addDoc(collection(db, ATTENDANCE_COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(doc(db, ATTENDANCE_COLLECTION, existing.docs[0].id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function fetchRsvpsByEvent(eventId: string): Promise<Rsvp[]> {
  const db = getDb();
  const q = query(collection(db, RSVP_COLLECTION), where('eventId', '==', eventId), orderBy('userEmail', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToRsvp);
}

export async function upsertRsvp(data: {
  eventId: string;
  userEmail: string;
  status: RsvpStatus;
}): Promise<void> {
  const db = getDb();
  const existing = await getDocs(
    query(
      collection(db, RSVP_COLLECTION),
      where('eventId', '==', data.eventId),
      where('userEmail', '==', data.userEmail)
    )
  );

  if (existing.empty) {
    await addDoc(collection(db, RSVP_COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(doc(db, RSVP_COLLECTION, existing.docs[0].id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function fetchMembers(): Promise<Member[]> {
  const db = getDb();
  const snapshot = await getDocs(collection(db, MEMBER_COLLECTION));
  return snapshot.docs.map(docToMember);
}
