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
    setDoc,
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
let allMembers = [];

// --- 輔助函式 ---
function hasPermission(requiredRole) {
    return ROLE_HIERARCHY.indexOf(currentUserRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

function updateNavigationUI() {
    const uploadBtn = document.querySelector('[data-section="upload"]');
    const listBtn = document.querySelector('[data-section="list"]');
    const adminBtn = document.querySelector('[data-section="admin"]');
    
    const scheduleBtn = document.querySelector('[data-section="schedule"]');

    if (uploadBtn) uploadBtn.style.display = (currentUser && hasPermission("member")) ? 'inline-block' : 'none';
    if (listBtn) listBtn.style.display = (currentUser && hasPermission("finance")) ? 'inline-block' : 'none';
    if (adminBtn) adminBtn.style.display = (currentUser && hasPermission("developer")) ? 'inline-block' : 'none';
    if (scheduleBtn) scheduleBtn.style.display = currentUser ? 'inline-block' : 'none';
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

// Admin 元素
const membersBody = document.getElementById('members-body');
const memberModal = document.getElementById('member-modal');
const memberForm = document.getElementById('member-form');
const closeMemberModal = document.getElementById('close-modal');
const addMemberBtn = document.getElementById('add-member-btn');
const memberSearch = document.getElementById('member-search');
const roleFilter = document.getElementById('role-filter');

// --- 1. 導覽邏輯 ---
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetSection = btn.getAttribute('data-section');
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sections.forEach(sec => {
            sec.style.display = sec.id === `section-${targetSection}` ? 'block' : 'none';
        });

        if (targetSection === 'list') loadReceipts();
        if (targetSection === 'admin') loadMembers();
        if (targetSection === 'schedule') loadSchedule();
    });
});

// --- 2. 認證邏輯 ---
loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, googleProvider).catch(err => console.error("登入失敗:", err));
});
logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        try {
            const memberSnap = await getDoc(doc(db, "member", user.email));
            if (memberSnap.exists()) {
                const data = memberSnap.data();
                currentUserName = data.Name || user.email;
                currentUserRole = data.Role || "guest";
            } else {
                currentUserName = user.email;
                currentUserRole = "guest";
            }
        } catch (err) {
            currentUserRole = "guest";
        }
        userEmailSpan.textContent = `${currentUserName} (${currentUserRole})`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        loginWelcome.style.display = 'block';
    } else {
        currentUserRole = "guest";
        currentUserName = "";
        userEmailSpan.textContent = '';
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        loginWelcome.style.display = 'none';
    }
    updateNavigationUI();
});

// --- 3. 收據邏輯 ---
uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('receipt-file').files[0];
    const statusDiv = document.getElementById('upload-status');
    const submitBtn = document.getElementById('submit-upload');
    if (!file) return;

    try {
        statusDiv.textContent = "上傳中...";
        submitBtn.disabled = true;
        const filePath = `receipts/${currentUser.email}/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, filePath);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);

        await addDoc(collection(db, "receipts"), {
            title: document.getElementById('receipt-title').value,
            amount: Number(document.getElementById('receipt-amount').value),
            note: document.getElementById('receipt-note').value,
            fileUrl,
            uploadedBy: currentUserName || currentUser.email,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        statusDiv.textContent = "成功！";
        uploadForm.reset();
    } catch (err) {
        statusDiv.textContent = "失敗";
    } finally {
        submitBtn.disabled = false;
    }
});

async function loadReceipts() {
    receiptsBody.innerHTML = '<tr><td colspan="7">載入中...</td></tr>';
    try {
        const q = query(collection(db, "receipts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        receiptsBody.innerHTML = '';
        snap.forEach(d => {
            const data = d.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.title}</td>
                <td>$${data.amount}</td>
                <td>${data.uploadedBy}</td>
                <td class="status-${data.status}">${data.status}</td>
                <td>${data.createdAt?.toDate().toLocaleDateString() || ''}</td>
                <td><a href="${data.fileUrl}" target="_blank">查看</a></td>
                <td id="act-${d.id}"></td>
            `;
            if (hasPermission("developer") && data.status === 'pending') {
                const btn = document.createElement('button');
                btn.textContent = '核准';
                btn.onclick = () => approveReceipt(d.id);
                tr.querySelector(`#act-${d.id}`).appendChild(btn);
            }
            receiptsBody.appendChild(tr);
        });
    } catch (err) { receiptsBody.innerHTML = '讀取失敗'; }
}

async function approveReceipt(id) {
    if (confirm("確定核准？")) {
        await updateDoc(doc(db, "receipts", id), { status: 'approved' });
        loadReceipts();
    }
}

// --- 4. Admin Panel 邏輯 ---
async function loadMembers() {
    membersBody.innerHTML = '<tr><td colspan="5">載入中...</td></tr>';
    try {
        const snap = await getDocs(collection(db, "member"));
        allMembers = [];
        snap.forEach(d => allMembers.push({ id: d.id, ...d.data() }));
        renderMembers(allMembers);
    } catch (err) { membersBody.innerHTML = '讀取失敗'; }
}

function renderMembers(list) {
    membersBody.innerHTML = '';
    list.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${m.Name}</td>
            <td>${m.id}</td>
            <td><span class="badge badge-role-${m.Role}">${m.Role}</span></td>
            <td><span class="badge badge-status-${m.Status}">${m.Status}</span></td>
            <td>
                <button class="action-btn edit-btn" onclick="openEditMember('${m.id}')">編輯</button>
                <button class="action-btn toggle-btn" onclick="toggleMemberStatus('${m.id}', '${m.Status}')">
                    ${m.Status === 'active' ? '停用' : '啟用'}
                </button>
            </td>
        `;
        membersBody.appendChild(tr);
    });
}

// 搜尋與篩選
[memberSearch, roleFilter].forEach(el => el?.addEventListener('input', () => {
    const search = memberSearch.value.toLowerCase();
    const role = roleFilter.value;
    const filtered = allMembers.filter(m => 
        (m.Name.toLowerCase().includes(search) || m.id.toLowerCase().includes(search)) &&
        (role === 'all' || m.Role === role)
    );
    renderMembers(filtered);
}));

// Modal 控制
addMemberBtn.onclick = () => {
    memberForm.reset();
    document.getElementById('edit-mode').value = "false";
    document.getElementById('m-email').disabled = false;
    document.getElementById('modal-title').textContent = "新增成員";
    memberModal.style.display = 'flex';
};
closeMemberModal.onclick = () => memberModal.style.display = 'none';

window.openEditMember = async (id) => {
    const m = allMembers.find(x => x.id === id);
    if (!m) return;
    document.getElementById('edit-mode').value = "true";
    document.getElementById('m-email').value = m.id;
    document.getElementById('m-email').disabled = true;
    document.getElementById('m-name').value = m.Name;
    document.getElementById('m-role').value = m.Role;
    document.getElementById('m-status').value = m.Status;
    document.getElementById('modal-title').textContent = "編輯成員";
    memberModal.style.display = 'flex';
};

memberForm.onsubmit = async (e) => {
    e.preventDefault();
    const isEdit = document.getElementById('edit-mode').value === "true";
    const email = document.getElementById('m-email').value;
    const name = document.getElementById('m-name').value;
    const role = document.getElementById('m-role').value;
    const status = document.getElementById('m-status').value;

    if (isEdit) {
        const developers = allMembers.filter(m => m.Role === 'developer' && m.Status === 'active');
        const target = allMembers.find(m => m.id === email);
        if (target.Role === 'developer' && role !== 'developer' && developers.length <= 1) {
            alert("不可移除最後一個有效的 Developer");
            return;
        }
        if (target.Role === 'developer' && status === 'inactive' && developers.length <= 1) {
            alert("不可停用最後一個 Developer");
            return;
        }
    }

    try {
        if (!isEdit) {
            const check = await getDoc(doc(db, "member", email));
            if (check.exists()) { alert("此 Email 已存在"); return; }
        }
        await setDoc(doc(db, "member", email), { Name: name, Role: role, Status: status, Email: email });
        memberModal.style.display = 'none';
        loadMembers();
    } catch (err) { alert("儲存失敗"); }
};

window.toggleMemberStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const developers = allMembers.filter(m => m.Role === 'developer' && m.Status === 'active');
    const target = allMembers.find(m => m.id === id);
    if (target.Role === 'developer' && newStatus === 'inactive' && developers.length <= 1) {
        alert("不可停用最後一個 Developer");
        return;
    }
    await updateDoc(doc(db, "member", id), { Status: newStatus });
    loadMembers();
};

// ===== 5. Schedule 邏輯 =====

// 生成未來 14 天日期陣列
function getNext14Days() {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        days.push(`${yyyy}-${mm}-${dd}`);
    }
    return days;
}

function formatDateLabel(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return `${m}月${d}日 ${weekdays[date.getDay()]}`;
}

let scheduleFilter = 'all';
let allResponses = [];

async function loadSchedule() {
    const container = document.getElementById('schedule-cards');
    container.innerHTML = '<p style="color:#999;">載入中...</p>';

    try {
        const snap = await getDocs(collection(db, 'scheduleResponses'));
        allResponses = [];
        snap.forEach(d => allResponses.push({ id: d.id, ...d.data() }));
        renderSchedule();
    } catch (err) {
        container.innerHTML = '<p>讀取失敗，請稍後再試</p>';
        console.error(err);
    }

    // 筛選按鈕事件
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            scheduleFilter = btn.getAttribute('data-filter');
            renderSchedule();
        };
    });
}

function renderSchedule() {
    const container = document.getElementById('schedule-cards');
    container.innerHTML = '';
    container.className = 'schedule-cards';

    let days = getNext14Days();

    // 筛選：未來 7 日
    if (scheduleFilter === 'week') {
        days = days.slice(0, 7);
    }

    // 筛選：熱門（按 yes 數量排序）
    if (scheduleFilter === 'popular') {
        days = [...days].sort((a, b) => {
            const yesA = allResponses.filter(r => r.date === a && r.response === 'yes').length;
            const yesB = allResponses.filter(r => r.date === b && r.response === 'yes').length;
            return yesB - yesA;
        });
    }

    days.forEach(dateStr => {
        const responses = allResponses.filter(r => r.date === dateStr);
        const yesCount   = responses.filter(r => r.response === 'yes').length;
        const maybeCount = responses.filter(r => r.response === 'maybe').length;
        const noCount    = responses.filter(r => r.response === 'no').length;
        const attendees  = responses.filter(r => r.response === 'yes').map(r => r.userName).join('、');

        const myResponse = currentUser
            ? (responses.find(r => r.userEmail === currentUser.email)?.response || null)
            : null;

        const card = document.createElement('div');
        card.className = 'date-card';

        const disabledAttr = currentUser ? '' : 'disabled';

        card.innerHTML = `
            <div class="date-card-header">
                <span class="date-card-title">${formatDateLabel(dateStr)}</span>
                <div class="response-badges">
                    <span class="rbadge rbadge-yes">✔ ${yesCount}</span>
                    <span class="rbadge rbadge-maybe">? ${maybeCount}</span>
                    <span class="rbadge rbadge-no">✖ ${noCount}</span>
                </div>
            </div>
            <div class="attendees-list">${attendees ? '會去：' + attendees : '暫無人回覆會去'}</div>
            <div class="vote-buttons">
                <button class="vote-btn vote-btn-yes ${myResponse === 'yes' ? 'selected' : ''}" ${disabledAttr} onclick="castVote('${dateStr}', 'yes')">會去</button>
                <button class="vote-btn vote-btn-maybe ${myResponse === 'maybe' ? 'selected' : ''}" ${disabledAttr} onclick="castVote('${dateStr}', 'maybe')">可能去</button>
                <button class="vote-btn vote-btn-no ${myResponse === 'no' ? 'selected' : ''}" ${disabledAttr} onclick="castVote('${dateStr}', 'no')">不去</button>
            </div>
            ${!currentUser ? '<p class="login-hint">請登入後才能投票</p>' : ''}
        `;
        container.appendChild(card);
    });
}

window.castVote = async (dateStr, response) => {
    if (!currentUser) return;
    const docId = `${dateStr}_${currentUser.email}`;
    try {
        await setDoc(doc(db, 'scheduleResponses', docId), {
            date: dateStr,
            userEmail: currentUser.email,
            userName: currentUserName || currentUser.email,
            response,
            updatedAt: serverTimestamp()
        });
        // 更新本地快照再重繪
        const idx = allResponses.findIndex(r => r.id === docId);
        const entry = { id: docId, date: dateStr, userEmail: currentUser.email, userName: currentUserName || currentUser.email, response };
        if (idx >= 0) allResponses[idx] = entry;
        else allResponses.push(entry);
        renderSchedule();
    } catch (err) {
        alert('投票失敗，請稍後再試');
        console.error(err);
    }
};