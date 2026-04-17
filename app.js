import { auth, db, storage, googleProvider } from './firebase-config.js';
import { 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    doc, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- 設定 ---
// TODO: 在這裡加入管理員的 Email 白名單
const ADMIN_EMAILS = ['choiyinyul721@gmail.com'];

// --- 狀態變數 ---
let currentUser = null;

// --- DOM 元素 ---
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.page-section');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');
const loginWelcome = document.getElementById('login-welcome');
const uploadForm = document.getElementById('upload-form');
const receiptsBody = document.getElementById('receipts-body');

// --- 1. 導覽切換邏輯 ---
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetSection = btn.getAttribute('data-section');
        
        // 切換按鈕樣式
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 切換區塊顯示
        sections.forEach(sec => {
            sec.style.display = sec.id === `section-${targetSection}` ? 'block' : 'none';
        });

        // 進入清單頁面時刷新資料
        if (targetSection === 'list') {
            loadReceipts();
        }
    });
});

// --- 2. 身份驗證邏輯 ---
loginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("登入失敗:", error);
        alert("登入失敗，請稍後再試。");
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        userEmailSpan.textContent = user.email;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        loginWelcome.style.display = 'block';
    } else {
        userEmailSpan.textContent = '';
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        loginWelcome.style.display = 'none';
    }
});

// --- 3. 上傳功能 ---
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        alert("請先登入才能上傳收據");
        return;
    }

    const title = document.getElementById('receipt-title').value;
    const amount = Number(document.getElementById('receipt-amount').value);
    const note = document.getElementById('receipt-note').value;
    const file = document.getElementById('receipt-file').files[0];
    const statusDiv = document.getElementById('upload-status');

    if (!file) return;

    try {
        statusDiv.textContent = "正在上傳檔案...";
        const submitBtn = document.getElementById('submit-upload');
        submitBtn.disabled = true;

        // A. 上傳到 Firebase Storage
        const fileRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(uploadResult.ref);

        // B. 儲存到 Firestore
        await addDoc(collection(db, "receipts"), {
            title,
            amount,
            note,
            fileUrl,
            uploadedBy: currentUser.email,
            status: 'pending',
            createdAt: serverTimestamp()
        });

        statusDiv.textContent = "上傳成功！";
        uploadForm.reset();
        setTimeout(() => statusDiv.textContent = "", 3000);
    } catch (error) {
        console.error("上傳失敗:", error);
        statusDiv.textContent = "上傳失敗，請檢查權限或聯絡管理員。";
    } finally {
        document.getElementById('submit-upload').disabled = false;
    }
});

// --- 4. 讀取清單 ---
async function loadReceipts() {
    if (!receiptsBody) return;
    receiptsBody.innerHTML = '<tr><td colspan="7">載入中...</td></tr>';

    try {
        const q = query(collection(db, "receipts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        receiptsBody.innerHTML = '';

        const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : '處理中...';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.title}</td>
                <td>$${data.amount}</td>
                <td>${data.uploadedBy}</td>
                <td class="status-${data.status}">${data.status === 'pending' ? '待審核' : '已核准'}</td>
                <td>${date}</td>
                <td><a href="${data.fileUrl}" target="_blank">查看</a></td>
                <td id="action-${docSnap.id}"></td>
            `;

            // 如果是管理員且狀態為 pending，顯示審核按鈕
            if (isAdmin && data.status === 'pending') {
                const approveBtn = document.createElement('button');
                approveBtn.textContent = '核准';
                approveBtn.className = 'approve-btn';
                approveBtn.onclick = () => approveReceipt(docSnap.id);
                tr.querySelector(`#action-${docSnap.id}`).appendChild(approveBtn);
            }

            receiptsBody.appendChild(tr);
        });
    } catch (error) {
        console.error("讀取清單失敗:", error);
        receiptsBody.innerHTML = '<tr><td colspan="7">無法讀取資料，請確認資料庫權限。</td></tr>';
    }
}

// --- 5. 審核功能 ---
async function approveReceipt(docId) {
    if (!confirm("確定要核准這張收據嗎？")) return;

    try {
        const docRef = doc(db, "receipts", docId);
        await updateDoc(docRef, {
            status: 'approved'
        });
        alert("已核准");
        loadReceipts(); // 刷新清單
    } catch (error) {
        console.error("審核失敗:", error);
        alert("核准失敗");
    }
}
