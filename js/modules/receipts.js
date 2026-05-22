import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const RECEIPTS_QUERY_TIMEOUT_MS = 12000;
const DEFAULT_MONTHLY_RENT = 10000;

function withTimeout(taskPromise, timeoutMs) {
  // 為 Firestore 查詢加上逾時保底，避免網路或權限異常時介面永遠停在載入中
  return Promise.race([
    taskPromise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('RECEIPTS_QUERY_TIMEOUT')), timeoutMs);
    })
  ]);
}

function formatDateInput(dateValue) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDayRange(dateText, isEnd) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (isEnd) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

function renderReceiptsPage(appState, hasPermission) {
  void appState;
  void hasPermission;

  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  appContent.innerHTML = `
    <section id="section-upload" class="page-section" style="display:none;">
      <h2>上傳收據</h2>
      <form id="receipt-upload-form">
        <input id="receipt-title" placeholder="標題" required>
        <input id="receipt-amount" type="number" placeholder="金額" required>
        <input id="receipt-note" placeholder="備註">
        <input id="receipt-file" type="file" accept="image/*,.pdf" required>
        <button type="submit">送出</button>
      </form>
    </section>

    <section id="section-list" class="page-section">
      <h2>收據歷史記錄</h2>

      <div class="monthly-report-card" style="margin:16px 0;padding:12px;border:1px solid #eee;border-radius:8px;">
        <h3 style="margin:0 0 10px 0;">月度報表結算</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;">
          <label>開始日<br><input id="report-start-date" type="date" value="${formatDateInput(currentMonthStart)}"></label>
          <label>結束日<br><input id="report-end-date" type="date" value="${formatDateInput(today)}"></label>
          <label>水電<br><input id="report-utilities" type="number" min="0" step="1" value="0"></label>
          <label>租金（固定）<br><input id="report-rent" type="number" value="${DEFAULT_MONTHLY_RENT}" disabled></label>
          <button id="generate-report-btn" type="button">計算報表</button>
        </div>
        <div id="report-results" style="display:none;margin-top:10px;line-height:1.7;">
          <div>核准收據總額：<strong id="res-total-approved">$0</strong></div>
          <div>固定支出（水電+租金）：<strong id="res-total-fixed">$0</strong></div>
          <div>總支出：<strong id="res-total-sum">$0</strong></div>
          <div>每人分攤（8人）：<strong id="res-per-person">$0</strong></div>
        </div>
      </div>

      <h3>收據清單</h3>
      <table class="receipt-table">
        <thead>
          <tr>
            <th>標題</th>
            <th>金額</th>
            <th>上傳者</th>
            <th>狀態</th>
            <th>日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="receipts-body">
          <tr><td colspan="6">載入中...</td></tr>
        </tbody>
      </table>
    </section>

    <div id="receipt-modal" class="modal" style="display:none;">
      <div class="modal-content">
        <div id="receipt-detail-body"></div>
        <div class="modal-footer">
          <button id="close-receipt-modal">關閉</button>
        </div>
      </div>
    </div>
  `;
}

function receiptCreatedAtLabel(data) {
  return data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : '';
}

async function loadReceipts(db, appState, hasPermission, showToast) {
  const receiptsBody = document.getElementById('receipts-body');
  if (!receiptsBody) return;
  receiptsBody.innerHTML = '<tr><td colspan="6">載入中...</td></tr>';

  try {
    const receiptsQuery = query(collection(db, 'receipts'), orderBy('createdAt', 'desc'));
    const snap = await withTimeout(getDocs(receiptsQuery), RECEIPTS_QUERY_TIMEOUT_MS);

    receiptsBody.innerHTML = '';
    snap.forEach((receiptDoc) => {
      const data = receiptDoc.data();
      const tr = document.createElement('tr');

      const titleTd = document.createElement('td');
      const titleLink = document.createElement('span');
      titleLink.className = 'title-link';
      titleLink.textContent = data.title || '未命名';
      titleLink.onclick = () => showReceiptDetail(receiptDoc.id, data, db, appState, hasPermission, showToast);
      titleTd.appendChild(titleLink);

      tr.innerHTML = `
        <td>$${data.amount ?? 0}</td>
        <td>${data.uploadedBy || ''}</td>
        <td><span class="badge status-${data.status}">${data.status}</span></td>
        <td>${receiptCreatedAtLabel(data)}</td>
        <td id="act-${receiptDoc.id}"></td>
      `;
      tr.prepend(titleTd);

      const actionsCell = tr.querySelector(`#act-${receiptDoc.id}`);
      const isUploader = appState.currentUser && (appState.currentUser.email === data.uploadedByEmail || appState.currentUser.email === data.uploadedBy);

      if (hasPermission('can_approve_receipts') && data.status === 'pending') {
        const button = document.createElement('button');
        button.className = 'action-btn';
        button.textContent = '核准';
        button.onclick = () => approveReceipt(receiptDoc.id, db, showToast);
        actionsCell.appendChild(button);
      }

      if (hasPermission('can_reject_receipts') && data.status === 'pending') {
        const button = document.createElement('button');
        button.className = 'action-btn reject';
        button.textContent = '拒絕';
        button.onclick = () => rejectReceipt(receiptDoc.id, db, showToast);
        actionsCell.appendChild(button);
      }

      const canDeleteSelf = isUploader && (data.status === 'pending' || data.status === 'rejected');
      const canDeleteAdmin = hasPermission('developer') && data.status === 'rejected';
      if (canDeleteSelf || canDeleteAdmin) {
        const button = document.createElement('button');
        button.className = 'action-btn delete';
        button.textContent = '刪除';
        button.onclick = () => deleteReceipt(receiptDoc.id, db, showToast);
        actionsCell.appendChild(button);
      }

      receiptsBody.appendChild(tr);
    });

    if (snap.empty) {
      receiptsBody.innerHTML = '<tr><td colspan="6">目前沒有收據資料</td></tr>';
    }
  } catch (error) {
    console.error('[receipts] load failed:', error);
    receiptsBody.innerHTML = '<tr><td colspan="6">讀取失敗</td></tr>';
    const isTimeout = error?.message === 'RECEIPTS_QUERY_TIMEOUT';
    showToast(isTimeout ? '讀取逾時，請稍後再試' : '讀取收據失敗', 'error');
  }
}

async function generateMonthlyReport(db, showToast) {
  const startDateText = document.getElementById('report-start-date')?.value;
  const endDateText = document.getElementById('report-end-date')?.value;
  const utilitiesValue = Number(document.getElementById('report-utilities')?.value || 0);
  const resultsPanel = document.getElementById('report-results');

  if (!startDateText || !endDateText) {
    showToast('請選擇開始日與結束日', 'error');
    return;
  }

  const startDate = toDayRange(startDateText, false);
  const endDate = toDayRange(endDateText, true);

  if (!startDate || !endDate) {
    showToast('日期格式不正確', 'error');
    return;
  }
  if (startDate > endDate) {
    showToast('開始日不可晚於結束日', 'error');
    return;
  }

  try {
    const approvedQuery = query(collection(db, 'receipts'), where('status', '==', 'approved'));
    const approvedSnap = await withTimeout(getDocs(approvedQuery), RECEIPTS_QUERY_TIMEOUT_MS);

    let totalApproved = 0;
    approvedSnap.forEach((receiptDoc) => {
      const data = receiptDoc.data();
      const createdAtDate = data.createdAt?.toDate ? data.createdAt.toDate() : null;
      if (!createdAtDate) return;
      if (createdAtDate >= startDate && createdAtDate <= endDate) {
        totalApproved += Number(data.amount) || 0;
      }
    });

    const totalFixed = utilitiesValue + DEFAULT_MONTHLY_RENT;
    const totalSum = totalFixed + totalApproved;
    const perPerson = Math.round(totalSum / 8);

    document.getElementById('res-total-approved').textContent = `$${totalApproved.toLocaleString()}`;
    document.getElementById('res-total-fixed').textContent = `$${totalFixed.toLocaleString()}`;
    document.getElementById('res-total-sum').textContent = `$${totalSum.toLocaleString()}`;
    document.getElementById('res-per-person').textContent = `$${perPerson.toLocaleString()}`;
    if (resultsPanel) resultsPanel.style.display = 'block';

    showToast(`報表計算完成：${startDateText} 至 ${endDateText}`, 'success');
  } catch (error) {
    console.error('[receipts] report failed:', error);
    showToast('產生報表失敗', 'error');
  }
}

function showReceiptDetail(id, data, db, appState, hasPermission, showToast) {
  void appState;

  const modal = document.getElementById('receipt-modal');
  const detailBody = document.getElementById('receipt-detail-body');
  if (!modal || !detailBody) return;

  const canApprove = hasPermission('can_approve_receipts') && data.status === 'pending';
  const canReject = hasPermission('can_reject_receipts') && data.status === 'pending';
  const reasonHTML = data.status === 'rejected' && data.rejectionNote ? `
    <div style="background:#fff5f5;border-left:4px solid #e74c3c;padding:10px;margin:10px 0;border-radius:4px;">
      <p style="color:#e74c3c;font-weight:bold;margin-bottom:4px;">拒絕原因：</p>
      <p style="color:#444;font-size:0.9em;margin:0;">${data.rejectionNote}</p>
    </div>` : '';

  detailBody.innerHTML = `
    <div class="receipt-info">
      <p><strong>標題：</strong>${data.title || ''}</p>
      <p><strong>金額：</strong>$${data.amount ?? 0}</p>
      <p><strong>上傳者：</strong>${data.uploadedBy || ''}</p>
      <p><strong>狀態：</strong><span class="badge status-${data.status}">${data.status}</span></p>
      <p><strong>備註：</strong>${data.note || '無'}</p>
      ${reasonHTML}
    </div>
    ${data.fileUrl ? `<img src="${data.fileUrl}" alt="收據文件">` : ''}
  `;

  const footer = modal.querySelector('.modal-footer');
  footer.querySelectorAll('.dynamic-btn').forEach((button) => button.remove());

  if (canApprove) {
    const approveButton = document.createElement('button');
    approveButton.className = 'primary-btn dynamic-btn';
    approveButton.textContent = '核准收據';
    approveButton.onclick = async () => {
      await approveReceipt(id, db, showToast);
      modal.style.display = 'none';
    };
    footer.prepend(approveButton);
  }

  if (canReject) {
    const rejectButton = document.createElement('button');
    rejectButton.className = 'action-btn reject dynamic-btn';
    rejectButton.style.marginRight = 'auto';
    rejectButton.textContent = '拒絕此收據';
    rejectButton.onclick = async () => {
      await rejectReceipt(id, db, showToast);
      modal.style.display = 'none';
    };
    footer.prepend(rejectButton);
  }

  modal.querySelector('#close-receipt-modal').onclick = () => { modal.style.display = 'none'; };
  modal.style.display = 'flex';
}

async function approveReceipt(id, db, showToast) {
  if (!confirm('確定核准？')) return;
  try {
    await updateDoc(doc(db, 'receipts', id), { status: 'approved' });
    showToast('已核准收據', 'success');
    window.loadReceipts?.();
  } catch {
    showToast('核准失敗', 'error');
  }
}

async function rejectReceipt(id, db, showToast) {
  const reason = prompt('請輸入拒絕原因 (讓上傳者知道哪裡錯了)：');
  if (reason === null) return;
  if (!reason.trim()) {
    showToast('必須輸入原因才能拒絕', 'error');
    return;
  }

  try {
    await updateDoc(doc(db, 'receipts', id), { status: 'rejected', rejectionNote: reason.trim() });
    showToast('已拒絕收據並附上原因', 'info');
    window.loadReceipts?.();
  } catch {
    showToast('操作失敗', 'error');
  }
}

async function deleteReceipt(id, db, showToast) {
  if (!confirm('確定刪除此收據？刪除後無法恢復。')) return;
  try {
    await deleteDoc(doc(db, 'receipts', id));
    showToast('已刪除收據', 'success');
    window.loadReceipts?.();
  } catch {
    showToast('刪除失敗', 'error');
  }
}

function bindReportEvents(db, showToast) {
  const button = document.getElementById('generate-report-btn');
  if (!button) return;
  button.onclick = () => generateMonthlyReport(db, showToast);
}

export function initReceiptsModule({ db, storage, appState, hasPermission, showToast }) {
  window.addEventListener('pageChange', async (event) => {
    if (event.detail.page !== 'list' && event.detail.page !== 'upload') return;

    renderReceiptsPage(appState, hasPermission);
    bindReportEvents(db, showToast);

    const uploadSection = document.getElementById('section-upload');
    const listSection = document.getElementById('section-list');
    if (uploadSection && listSection) {
      const isUploadPage = event.detail.page === 'upload';
      uploadSection.style.display = isUploadPage ? 'block' : 'none';
      listSection.style.display = isUploadPage ? 'none' : 'block';
    }

    if (event.detail.page === 'list') {
      await loadReceipts(db, appState, hasPermission, showToast);
    }

    document.getElementById('receipt-upload-form')?.addEventListener('submit', async (submitEvent) => {
      submitEvent.preventDefault();
      const file = document.getElementById('receipt-file').files[0];
      if (!appState.currentUser) {
        showToast('請先登入再上傳', 'error');
        return;
      }
      if (!file) {
        showToast('請先選擇收據檔案', 'error');
        return;
      }

      const submitButton = submitEvent.target.querySelector('[type="submit"]');
      if (submitButton) submitButton.disabled = true;

      try {
        // 延續舊版路徑規則，檔案路徑帶上使用者 email 便於稽核
        const fileRef = ref(storage, `receipts/${appState.currentUser.email}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);

        await addDoc(collection(db, 'receipts'), {
          title: document.getElementById('receipt-title').value.trim(),
          amount: Number(document.getElementById('receipt-amount').value),
          note: document.getElementById('receipt-note').value.trim(),
          fileUrl,
          status: 'pending',
          uploadedBy: appState.currentUser.email,
          uploadedByEmail: appState.currentUser.email,
          createdAt: serverTimestamp()
        });

        showToast('收據已上傳', 'success');
        submitEvent.target.reset();
        await loadReceipts(db, appState, hasPermission, showToast);
      } catch (error) {
        console.error('[receipts] upload failed:', error);
        showToast('收據上傳失敗', 'error');
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  });

  window.loadReceipts = () => loadReceipts(db, appState, hasPermission, showToast);
  return { ready: true, name: 'receipts' };
}
