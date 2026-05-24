import { getStorage } from 'firebase/storage';
import { getFirebaseApp } from './client';

export function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}