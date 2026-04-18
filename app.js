import { auth, db, storage, googleProvider } from './firebase-config.js';
import { 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDoc,
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
const ROLE_HIERARCHY = ["guest", "member", "finance", "developer"];

// --- 狀態變數 ---
let currentUser = null;
let currentUserRole = "guest";
let currentUserName = "";

// --- 輔助函式 ---
function hasPermission(requiredRole) {
    return ROLE_HIERARCHY.indexOf(currentUserRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

function updateNavigationUI() {
    const uploadBtn = document.querySelector('[data-section="upload"]');
    const listBtn = document.querySelector('[data-section="list"]');
    
    // 上傳功能：需具備 member 權限
    if (uploadBtn) {
        uploadBtn.style.display = (currentUser && hasPermission("member")) ? 'inline-block' : 'none';
    }
    
    // 清單功能：需具備 finance 權限
    if (listBtn) {
        listBtn.style.display = (currentUser && hasPermission("finance")) ? 'inline-block' : 'none';
    }
}

// --- DOM 元素參考 ---
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

// --- 2. 認證邏輯 ---
// Google 登入
loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, googleProvider).catch((error) => {
        console.error("登入失敗:", error);
        alert("登入失敗，請稍後再試。");
    });
});

// 登出
logoutBtn.addEventListener('click', () => signOut(auth));

// 監聽認證狀態變化（含 Role 邏輯）
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    if (user) {
        // 讀取 Firestore 中的會員資料
        try {
            const memberRef = doc(db, "member", user.email);
            const memberSnap = await getDoc(memberRef);
            
            if (memberSnap.exists()) {
                const data = memberSnap.data();
                currentUserName = data.Name || user.email;
                currentUserRole = data.Role || "guest";
            } else {
                currentUserName = user.email;
                currentUserRole = "guest";
            }
        } catch (error) {
            console.error("權限讀取失敗:", error);
            currentUserName = user.email;
            currentUserRole = "guest";
        }

        // 更新 UI
        userEmailSpan.textContent = `${currentUserName} (${currentUserRole})`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        loginWelcome.style.display = 'block';
    } else {
        // 未登入狀態
        currentUserRole = "guest";
        currentUserName = "";
        userEmailSpan.textContent = '';
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        loginWelcome.style.display = 'none';
    }
    
    // 更新導覽按覽按鈕
    updateNavigationUI();
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
    const submitBtn = document.getElementById('submit-upload');

    if (!file) {
        alert("請選擇檔案");
        return;
    }

    try {
        statusDiv.textContent = "正在上傳檔案...";
        submitBtn.disabled = true;

        // 上傳檔案到 Storage
        const timestamp = Date.now();
        const fileRef = ref(storage, `receipts/${currentUser.email}/${timestamp}_${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);

        // 儲存收據資訊到 Firestore
        await addDoc(collection(db, "receipts"), {
            title,
            amount,
            note,
            fileUrl,
            uploadedBy: currentUserName || currentUser.email,
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
        submitBtn.disabled = false;
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

        // 檢查是否有審核權限（developer 或以上）
        const canApprove = hasPermission("developer");

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

            // 如果具備審核權限且狀態為 pending，顯示審核按鈕
            if (canApprove && data.status === 'pending') {
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
        alert("核准失敗，請稍後再試。");
    }
}