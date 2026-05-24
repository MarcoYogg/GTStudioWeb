import { getFirestore } from 'firebase/firestore';
import { getFirebaseApp } from './client';

export function getDb() {
  return getFirestore(getFirebaseApp());
}