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
    serverTimestamp,
    onSnapshot,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- 設定 ---
const ROLE_HIERARCHY = ["guest", "member", "finance", "developer"];

// 預設權限表 (可擴充)
const DEFAULT_PERMISSIONS = {
    "guest": {
        "can_view_receipts": false,
        "can_upload_receipts": false,
        "can_approve_receipts": false,
        "can_manage_members": false,
        "can_view_tickets": false,
        "can_view_schedule": true,
        "can_view_attendance": false,
        "can_report_tickets": false,
        "can_manage_tickets": false,
        "can_upload_receipts": false,
        "can_create_events": false,
        "can_rsvp": false
    },
    "member": {
        "can_view_receipts": true,
        "can_upload_receipts": true,
        "can_approve_receipts": false,
        "can_manage_members": false,
        "can_view_tickets": true,
        "can_view_schedule": true,
        "can_view_attendance": true,
        "can_report_tickets": true,
        "can_manage_tickets": false,
        "can_create_events": false,
        "can_rsvp": true
    },
    "finance": {
        "can_view_receipts": true,
        "can_upload_receipts": true,
        "can_approve_receipts": true,
        "can_manage_members": false,
        "can_view_tickets": true,
        "can_view_schedule": true,
        "can_view_attendance": true,
        "can_report_tickets": true,
        "can_manage_tickets": false,
        "can_create_events": false,
        "can_rsvp": true
    }
};

// --- 狀態變數 ---
let currentUser = null;
let currentUserRole = "guest";
let currentPermissions = { ...DEFAULT_PERMISSIONS["guest"] };
let globalPermissionsMap = { ...DEFAULT_PERMISSIONS };
let currentUserName = "";
let allMembers = [];

// --- 輔助函式 ---
function hasPermission(permissionName) {
    // developer 永遠擁有所有權限
    if (currentUserRole === "developer") return true;
    
    // 如果是舊有的角色名稱檢查，為了相容性暫時保留 (慢慢替換掉)
    if (ROLE_HIERARCHY.includes(permissionName)) {
        return ROLE_HIERARCHY.indexOf(currentUserRole) >= ROLE_HIERARCHY.indexOf(permissionName);
    }

    // 檢查新版權限
    return currentPermissions[permissionName] === true;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function updateNavigationUI() {
    const uploadBtn = document.querySelector('[data-section="upload"]');
    const listBtn = document.querySelector('[data-section="list"]');
    const adminBtn = document.querySelector('[data-section="admin"]');
    const ticketsBtn = document.querySelector('[data-section="tickets"]');
    const scheduleBtn = document.querySelector('[data-section="schedule"]');

    if (uploadBtn) uploadBtn.style.display = (currentUser && hasPermission("can_upload_receipts")) ? 'inline-block' : 'none';
    if (listBtn) listBtn.style.display = (currentUser && hasPermission("can_view_receipts")) ? 'inline-block' : 'none';
    if (adminBtn) adminBtn.style.display = (currentUser && hasPermission("developer")) ? 'inline-block' : 'none';
    if (scheduleBtn) scheduleBtn.style.display = (currentUser && hasPermission("can_view_schedule")) ? 'inline-block' : 'none';
    if (ticketsBtn) ticketsBtn.style.display = (currentUser && hasPermission("can_view_tickets")) ? 'inline-block' : 'none';
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
const receiptModal = document.getElementById('receipt-modal');
const receiptDetailBody = document.getElementById('receipt-detail-body');
const closeReceiptModal = document.getElementById('close-receipt-modal');

if (closeReceiptModal) {
    closeReceiptModal.onclick = () => receiptModal.style.display = 'none';
}

// Admin 元素
const membersBody = document.getElementById('members-body');
const memberModal = document.getElementById('member-modal');
const memberForm = document.getElementById('member-form');
const closeMemberModal = document.getElementById('close-modal');
const addMemberBtn = document.getElementById('add-member-btn');
const memberSearch = document.getElementById('member-search');
const roleFilter = document.getElementById('role-filter');

// 角色權限設定元素
const manageRolesBtn = document.getElementById('manage-roles-btn');
const rolesModal = document.getElementById('roles-modal');
const closeRolesModal = document.getElementById('close-roles-modal');
const rolesBody = document.getElementById('roles-body');
const saveRolesBtn = document.getElementById('save-roles-btn');

const PERMISSION_GROUPS = [
    {
        group: "查看 (Visibility)",
        items: {
            "can_view_receipts":    "查看收據列表",
            "can_view_tickets":     "查看問題回報",
            "can_view_schedule":    "查看出席日曆",
            "can_view_attendance":  "查看每日出席狀態"
        }
    },
    {
        group: "操作 (Action)",
        items: {
            "can_upload_receipts":  "上傳收據",
            "can_approve_receipts": "核准收據",
            "can_report_tickets":   "新增問題回報",
            "can_manage_tickets":   "管理問題回報（改狀態 / 刪除）",
            "can_create_events":    "新增日曆活動",
            "can_rsvp":             "標記出席回報"
        }
    }
];

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
        if (targetSection === 'schedule') initSchedule();
        if (targetSection === 'tickets') initTickets();
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
            // 讀取權限設定
            const configSnap = await getDoc(doc(db, "config", "permissions"));
            if (configSnap.exists()) {
                globalPermissionsMap = { ...DEFAULT_PERMISSIONS, ...configSnap.data() };
            }

            const memberSnap = await getDoc(doc(db, "member", user.email));
            if (memberSnap.exists()) {
                const data = memberSnap.data();
                currentUserName = data.Name || user.email;
                currentUserRole = data.Role || "guest";
            } else {
                currentUserName = user.email;
                currentUserRole = "guest";
            }
            
            // 更新當前權限
            currentPermissions = globalPermissionsMap[currentUserRole] || globalPermissionsMap["guest"];
            
        } catch (err) {
            console.error("讀取權限/使用者失敗:", err);
            currentUserRole = "guest";
            currentPermissions = globalPermissionsMap["guest"];
        }
        userEmailSpan.textContent = `${currentUserName} (${currentUserRole})`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        loginWelcome.style.display = 'block';
    } else {
        currentUserRole = "guest";
        currentPermissions = globalPermissionsMap["guest"];
        currentUserName = "";
        userEmailSpan.textContent = '';
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        loginWelcome.style.display = 'none';
    }
    updateNavigationUI();

    // 移除 Loading Overlay 並顯示內容
    document.body.classList.remove('app-hidden');
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
});

// --- 6. 權限管理邏輯 ---
manageRolesBtn.onclick = () => {
    renderRolesTable();
    rolesModal.style.display = 'flex';
};

closeRolesModal.onclick = () => rolesModal.style.display = 'none';

function renderRolesTable() {
    rolesBody.innerHTML = '';
    const roles = ["guest", "member", "finance"];

    PERMISSION_GROUPS.forEach(group => {
        const headerTr = document.createElement('tr');
        headerTr.innerHTML = `<td colspan="4" class="perm-group-header">${group.group}</td>`;
        rolesBody.appendChild(headerTr);

        Object.entries(group.items).forEach(([pKey, label]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${label}</td>`;
            roles.forEach(role => {
                const td = document.createElement('td');
                td.style.textAlign = 'center';
                const checked = globalPermissionsMap[role]?.[pKey] ? 'checked' : '';
                td.innerHTML = `<input type="checkbox" data-role="${role}" data-perm="${pKey}" ${checked}>`;
                tr.appendChild(td);
            });
            rolesBody.appendChild(tr);
        });
    });
}

saveRolesBtn.onclick = async () => {
    const newMap = JSON.parse(JSON.stringify(globalPermissionsMap)); 
    const checkboxes = rolesBody.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(cb => {
        const role = cb.getAttribute('data-role');
        const perm = cb.getAttribute('data-perm');
        newMap[role][perm] = cb.checked;
    });

    try {
        saveRolesBtn.disabled = true;
        saveRolesBtn.textContent = "儲存中...";
        await setDoc(doc(db, "config", "permissions"), newMap);
        globalPermissionsMap = newMap;
        
        // 如果當前用戶的角色被修改了，即時生效
        currentPermissions = globalPermissionsMap[currentUserRole] || globalPermissionsMap["guest"];
        updateNavigationUI();
        
        showToast("權限設定已更新", "success");
        rolesModal.style.display = 'none';
    } catch (err) {
        console.error(err);
        showToast("儲存失敗", "error");
    } finally {
        saveRolesBtn.disabled = false;
        saveRolesBtn.textContent = "儲存設定";
    }
};
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
        showToast("收據上傳成功！", "success");
        uploadForm.reset();
    } catch (err) {
        showToast("上傳失敗", "error");
    } finally {
        submitBtn.disabled = false;
    }
});

async function loadReceipts() {
    receiptsBody.innerHTML = '<tr><td colspan="6">載入中...</td></tr>';
    try {
        const q = query(collection(db, "receipts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        receiptsBody.innerHTML = '';
        snap.forEach(d => {
            const data = d.data();
            const tr = document.createElement('tr');
            
            // 建立標題連結
            const titleTd = document.createElement('td');
            const titleLink = document.createElement('span');
            titleLink.className = 'title-link';
            titleLink.textContent = data.title;
            titleLink.onclick = () => showReceiptDetail(d.id, data);
            titleTd.appendChild(titleLink);

            tr.innerHTML = `
                <td>$${data.amount}</td>
                <td>${data.uploadedBy}</td>
                <td><span class="badge status-${data.status}">${data.status}</span></td>
                <td>${data.createdAt?.toDate().toLocaleDateString() || ''}</td>
                <td id="act-${d.id}"></td>
            `;
            tr.prepend(titleTd);

            if (hasPermission("can_approve_receipts") && data.status === 'pending') {
                const btn = document.createElement('button');
                btn.className = 'action-btn';
                btn.textContent = '核准';
                btn.onclick = () => approveReceipt(d.id);
                tr.querySelector(`#act-${d.id}`).appendChild(btn);
            }
            receiptsBody.appendChild(tr);
        });
    } catch (err) { 
        receiptsBody.innerHTML = '讀取失敗'; 
        showToast("讀取收據失敗", "error");
    }
}

function showReceiptDetail(id, data) {
    const canApprove = hasPermission('can_approve_receipts') && data.status === 'pending';
    receiptDetailBody.innerHTML = `
        <div class="receipt-info">
            <p><strong>標題：</strong>${data.title}</p>
            <p><strong>金額：</strong>$${data.amount}</p>
            <p><strong>上傳者：</strong>${data.uploadedBy}</p>
            <p><strong>狀態：</strong><span class="badge status-${data.status}">${data.status}</span></p>
            <p><strong>備註：</strong>${data.note || '無'}</p>
        </div>
        <img src="${data.fileUrl}" alt="收據文件">
    `;
    // 動態加入核准按鈕
    const footer = receiptModal.querySelector('.modal-footer');
    const existingApproveBtn = footer.querySelector('#modal-approve-btn');
    if (existingApproveBtn) existingApproveBtn.remove();
    if (canApprove) {
        const approveBtn = document.createElement('button');
        approveBtn.id = 'modal-approve-btn';
        approveBtn.className = 'primary-btn';
        approveBtn.textContent = '核准收據';
        approveBtn.onclick = async () => {
            if (confirm('確定核准此收據？')) {
                await approveReceipt(id);
                receiptModal.style.display = 'none';
            }
        };
        footer.prepend(approveBtn);
    }
    receiptModal.style.display = 'flex';
}

async function approveReceipt(id) {
    if (confirm("確定核准？")) {
        try {
            await updateDoc(doc(db, "receipts", id), { status: 'approved' });
            showToast("已核准收據", "success");
            loadReceipts();
        } catch (err) {
            showToast("核准失敗", "error");
        }
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

// ===== 5. 出席日曆 =====

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let allPresence = [];
let allEvents = [];
let allRsvp = [];
let scheduleInitialized = false;
let presenceUnsub = null;
let eventsUnsub = null;
let rsvpUnsub = null;

function initSchedule() {
    if (scheduleInitialized) { renderCalendar(); return; }
    scheduleInitialized = true;

    presenceUnsub = onSnapshot(collection(db, 'scheduleResponses'), snap => {
        allPresence = [];
        snap.forEach(d => allPresence.push({ id: d.id, ...d.data() }));
        renderCalendar();
        refreshOpenDayModal();
    });

    eventsUnsub = onSnapshot(collection(db, 'events'), snap => {
        allEvents = [];
        snap.forEach(d => allEvents.push({ id: d.id, ...d.data() }));
        renderCalendar();
        refreshOpenDayModal();
    });

    rsvpUnsub = onSnapshot(collection(db, 'rsvp'), snap => {
        allRsvp = [];
        snap.forEach(d => allRsvp.push({ id: d.id, ...d.data() }));
        refreshOpenDayModal();
    });
}

function refreshOpenDayModal() {
    const modal = document.getElementById('day-modal');
    if (modal && modal.style.display !== 'none' && modal.dataset.openDate) {
        renderDayModal(modal.dataset.openDate);
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('cal-month-label');
    if (!grid || !label) return;

    label.textContent = `${calendarYear} 年 ${calendarMonth + 1} 月`;
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const today = new Date();

    grid.innerHTML = '';
    grid.className = 'calendar-grid';

    ['日','一','二','三','四','五','六'].forEach(d => {
        const h = document.createElement('div');
        h.className = 'cal-header-cell';
        h.textContent = d;
        grid.appendChild(h);
    });

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-cell cal-empty';
        grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const yesCount = allPresence.filter(r => r.date === dateStr && r.response === 'yes').length;
        const eventCount = allEvents.filter(e => e.date === dateStr).length;
        const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === d;
        const myResponse = currentUser ? (allPresence.find(r => r.date === dateStr && r.userEmail === currentUser.email)?.response || null) : null;

        const cell = document.createElement('div');
        cell.className = `cal-cell${isToday ? ' cal-today' : ''}${myResponse === 'yes' ? ' cal-going' : myResponse === 'no' ? ' cal-not-going' : ''}`;
        const eventsForCell = allEvents.filter(e => e.date === dateStr);
        const eventNamesHTML = eventsForCell.map(e => `<span class="cal-event-name">● ${e.title}</span>`).join('');
        cell.innerHTML = `
            <span class="cal-date-num">${d}</span>
            ${yesCount > 0 ? `<span class="cal-going-count">👥 ${yesCount}</span>` : ''}
            ${eventNamesHTML}
        `;
        cell.onclick = () => openDayModal(dateStr);
        grid.appendChild(cell);
    }
}

function openDayModal(dateStr) {
    const modal = document.getElementById('day-modal');
    modal.dataset.openDate = dateStr;
    renderDayModal(dateStr);
    modal.style.display = 'flex';
}

function renderDayModal(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const weekdays = ['週日','週一','週二','週三','週四','週五','週六'];
    const date = new Date(y, m-1, d);
    document.getElementById('day-modal-title').textContent = `${m}月${d}日 ${weekdays[date.getDay()]}`;

    const presenceForDay = allPresence.filter(r => r.date === dateStr);
    const myResponse = currentUser ? (presenceForDay.find(r => r.userEmail === currentUser.email)?.response || null) : null;

    // 出席區塊
    let presenceHTML = '';
    if (hasPermission('can_view_attendance')) {
        presenceHTML = `<div class="day-section"><h4>出席狀態</h4><div class="member-presence-list">`;
        const activeMembers = allMembers.filter(mb => mb.Status === 'active');
        activeMembers.forEach(member => {
            const resp = presenceForDay.find(r => r.userEmail === member.id);
            const status = resp?.response || 'unknown';
            const emoji = status === 'yes' ? '✅' : status === 'no' ? '❌' : '❓';
            presenceHTML += `<div class="member-presence-item"><span>${emoji}</span><span>${member.Name}</span></div>`;
        });
        presenceHTML += `</div>`;
    } else {
        presenceHTML = `<div class="day-section">`;
    }
    if (currentUser && hasPermission('can_rsvp')) {
        presenceHTML += `<div class="my-vote-row">
            <span>我的狀態：</span>
            <button class="vote-btn vote-btn-yes ${myResponse === 'yes' ? 'selected' : ''}" onclick="castPresence('${dateStr}', 'yes')">✅ 去</button>
            <button class="vote-btn vote-btn-no ${myResponse === 'no' ? 'selected' : ''}" onclick="castPresence('${dateStr}', 'no')">❌ 不去</button>
        </div>`;
    }
    presenceHTML += `</div>`;

    // 活動區塊
    const eventsForDay = allEvents.filter(e => e.date === dateStr);
    let eventsHTML = `<div class="day-section"><h4>活動 ${hasPermission('can_create_events') ? `<button class="inline-add-btn" onclick="openEventModal('${dateStr}')">+ 新增</button>` : ''}</h4>`;
    if (eventsForDay.length === 0) {
        eventsHTML += `<p class="no-events">今天沒有活動</p>`;
    } else {
        eventsForDay.forEach(ev => {
            const myRsvp = currentUser ? (allRsvp.find(r => r.eventId === ev.id && r.userEmail === currentUser.email)?.status || null) : null;
            const goingCount  = allRsvp.filter(r => r.eventId === ev.id && r.status === 'going').length;
            const maybeCount  = allRsvp.filter(r => r.eventId === ev.id && r.status === 'maybe').length;
            const timeLabel = ev.timeStart ? `🕐 ${ev.timeStart}${ev.timeEnd ? ' – ' + ev.timeEnd : ''}` : '';
            const isCreator = currentUser && currentUser.email === ev.createdBy;
            eventsHTML += `<div class="event-card">
                <div class="event-card-header">
                    <span class="event-card-title">${ev.title}</span>
                    ${isCreator ? `<button class="delete-event-btn" onclick="deleteEvent('${ev.id}')">刪除</button>` : ''}
                </div>
                ${timeLabel ? `<div class="event-meta">${timeLabel}</div>` : ''}
                ${ev.location ? `<div class="event-meta">📍 ${ev.location}</div>` : ''}
                ${ev.description ? `<div class="event-meta">${ev.description}</div>` : ''}
                <div class="event-rsvp-counts">✅ ${goingCount} Going &nbsp;｜&nbsp; 🤔 ${maybeCount} Maybe</div>
                ${currentUser ? `<div class="rsvp-buttons">
                    <button class="rsvp-btn ${myRsvp === 'going' ? 'selected' : ''}" onclick="castRsvp('${ev.id}', 'going')">Going</button>
                    <button class="rsvp-btn ${myRsvp === 'maybe' ? 'selected' : ''}" onclick="castRsvp('${ev.id}', 'maybe')">Maybe</button>
                    <button class="rsvp-btn rsvp-no ${myRsvp === 'not_going' ? 'selected' : ''}" onclick="castRsvp('${ev.id}', 'not_going')">Not Going</button>
                </div>` : ''}
            </div>`;
        });
    }
    eventsHTML += `</div>`;

    document.getElementById('day-modal-body').innerHTML = presenceHTML + eventsHTML;
}

window.castPresence = async (dateStr, response) => {
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
    } catch (err) {
        showToast('更新失敗', 'error');
    }
};

window.castRsvp = async (eventId, status) => {
    if (!currentUser) return;
    const docId = `${eventId}_${currentUser.email}`;
    try {
        await setDoc(doc(db, 'rsvp', docId), {
            eventId,
            userEmail: currentUser.email,
            status,
            updatedAt: serverTimestamp()
        });
    } catch (err) {
        showToast('RSVP 失敗', 'error');
    }
};

window.deleteEvent = async (eventId) => {
    if (!currentUser) return;
    if (!confirm('確定要刪除這個活動嗎？')) return;
    try {
        await deleteDoc(doc(db, 'events', eventId));
        showToast('活動已刪除', 'info');
    } catch (err) {
        showToast('刪除失敗', 'error');
    }
};

window.openEventModal = (dateStr) => {
    document.getElementById('event-form').reset();
    if (dateStr) document.getElementById('ev-date').value = dateStr;
    document.getElementById('event-modal').style.display = 'flex';
};

document.getElementById('cal-prev')?.addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    renderCalendar();
});
document.getElementById('cal-next')?.addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    renderCalendar();
});
document.getElementById('create-event-btn')?.addEventListener('click', () => openEventModal(null));
document.getElementById('close-day-modal')?.addEventListener('click', () => {
    document.getElementById('day-modal').style.display = 'none';
});
document.getElementById('close-event-modal')?.addEventListener('click', () => {
    document.getElementById('event-modal').style.display = 'none';
});
document.getElementById('event-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const submitBtn = e.target.querySelector('[type=submit]');
    submitBtn.disabled = true;
    try {
        await addDoc(collection(db, 'events'), {
            title: document.getElementById('ev-title').value,
            date: document.getElementById('ev-date').value,
            timeStart: document.getElementById('ev-time-start').value,
            timeEnd: document.getElementById('ev-time-end').value,
            location: document.getElementById('ev-location').value,
            description: document.getElementById('ev-desc').value,
            createdBy: currentUser.email,
            createdAt: serverTimestamp()
        });
        showToast('活動已建立！', 'success');
        document.getElementById('event-modal').style.display = 'none';
    } catch (err) {
        showToast('建立失敗', 'error');
    } finally {
        submitBtn.disabled = false;
    }
});



// ===== 6. Tickets =====

let allTickets = [];
let ticketFilter = 'all';
let ticketsInitialized = false;

function initTickets() {
    if (ticketsInitialized) return;
    ticketsInitialized = true;

    onSnapshot(
        query(collection(db, 'tickets'), orderBy('createdAt', 'desc')),
        snap => {
            allTickets = [];
            snap.forEach(d => allTickets.push({ id: d.id, ...d.data() }));
            renderTickets();
        }
    );

    document.querySelectorAll('.tk-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tk-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ticketFilter = btn.getAttribute('data-filter');
            renderTickets();
        });
    });
}

function renderTickets() {
    const list = document.getElementById('tickets-list');
    if (!list) return;

    const filtered = ticketFilter === 'all'
        ? allTickets
        : allTickets.filter(t => t.status === ticketFilter);

    if (filtered.length === 0) {
        list.innerHTML = '<p style="color:#aaa;">目前沒有 Ticket</p>';
        return;
    }

    const typeEmoji = { bug: '🐛', feature: '✨', improvement: '🔧' };
    const priorityClass = { low: 'priority-low', medium: 'priority-medium', high: 'priority-high' };
    const statusLabel = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' };

    list.innerHTML = filtered.map(t => {
        const canChangeStatus = hasPermission('can_manage_tickets');
        const canDelete = currentUser && (currentUser.email === t.createdBy || hasPermission('can_manage_tickets'));
        const date = t.createdAt?.toDate().toLocaleDateString() || '';

        const statusOptions = ['open', 'in_progress', 'resolved']
            .filter(s => s !== t.status)
            .map(s => `<button class="tk-status-btn" onclick="changeTicketStatus('${t.id}', '${s}')">${statusLabel[s]}</button>`)
            .join('');

        return `<div class="ticket-card ticket-status-${t.status}">
            <div class="ticket-card-header">
                <span class="ticket-type">${typeEmoji[t.type] || '📝'} ${t.title}</span>
                <span class="ticket-badge ${priorityClass[t.priority]}">${t.priority}</span>
            </div>
            <p class="ticket-desc">${t.description}</p>
            <div class="ticket-meta">
                <span class="tk-status-badge tk-status-${t.status}">${statusLabel[t.status]}</span>
                <span>by ${t.submittedBy}</span>
                <span>${date}</span>
            </div>
            <div class="ticket-actions">
                ${canChangeStatus ? statusOptions : ''}
                ${canDelete ? `<button class="tk-delete-btn" onclick="deleteTicket('${t.id}')">刪除</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

document.getElementById('ticket-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showToast('請先登入', 'error'); return; }
    const btn = document.getElementById('tk-submit');
    btn.disabled = true;
    try {
        await addDoc(collection(db, 'tickets'), {
            type: document.getElementById('tk-type').value,
            title: document.getElementById('tk-title').value,
            description: document.getElementById('tk-desc').value,
            priority: document.getElementById('tk-priority').value,
            status: 'open',
            submittedBy: currentUserName || currentUser.email,
            createdBy: currentUser.email,
            createdAt: serverTimestamp()
        });
        showToast('Ticket 已提交！', 'success');
        e.target.reset();
    } catch (err) {
        showToast('提交失敗', 'error');
    } finally {
        btn.disabled = false;
    }
});

window.changeTicketStatus = async (id, newStatus) => {
    try {
        await updateDoc(doc(db, 'tickets', id), { status: newStatus });
        showToast('狀態已更新', 'success');
    } catch (err) {
        showToast('更新失敗', 'error');
    }
};

window.deleteTicket = async (id) => {
    if (!confirm('確定刪除此 Ticket？')) return;
    try {
        await deleteDoc(doc(db, 'tickets', id));
        showToast('已刪除', 'info');
    } catch (err) {
        showToast('刪除失敗', 'error');
    }
};

