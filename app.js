import { auth, db, storage, googleProvider } from './js/firebase-config.js';
import { initApp } from './js/modules/app.js';

window.__GT = window.__GT || {};
window.__GT.firebase = { auth, db, storage, googleProvider };

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  const body = document.body;
  if (overlay) overlay.style.display = 'none';
  if (body) body.classList.remove('app-hidden');
}

function showBootError(error) {
  console.error('App bootstrap failed:', error);
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.innerHTML = '<p>載入失敗，請查看主控台錯誤訊息。</p>';
    overlay.style.display = 'flex';
  }
}

async function bootstrap() {
  try {
    initApp();
    hideLoading();
  } catch (error) {
    showBootError(error);
  }
}

bootstrap();
