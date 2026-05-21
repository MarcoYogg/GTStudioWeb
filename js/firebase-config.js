// Firebase Web SDK configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD99L0zN1NLOihokevDNS_W5qci94baOhE',
  authDomain: 'gtwebdb.firebaseapp.com',
  projectId: 'gtwebdb',
  storageBucket: 'gtwebdb.firebasestorage.app',
  messagingSenderId: '633444680315',
  appId: '1:633444680315:web:948a542cd9da83695418de',
  measurementId: 'G-ZG8MSNV1ET'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
