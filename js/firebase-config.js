// Firebase Web SDK 模組導入 (使用 CDN 方式，適合靜態網站)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// TODO: 請將您在 Firebase Console 建立專案後取得的 config 資訊貼在下方
// 前往 Firebase Console > 專案設定 > 一般 > 您的應用程式 > SDK 設定和配置
const firebaseConfig = {
  apiKey: "AIzaSyD99L0zN1NLOihokevDNS_W5qci94baOhE",
  authDomain: "gtwebdb.firebaseapp.com",
  projectId: "gtwebdb",
  storageBucket: "gtwebdb.firebasestorage.app",
  messagingSenderId: "633444680315",
  appId: "1:633444680315:web:948a542cd9da83695418de",
  measurementId: "G-ZG8MSNV1ET"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 導出實例供 app.js 使用
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
