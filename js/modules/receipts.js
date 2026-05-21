import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

function renderReceiptsPage(appState, hasPermission) {
  const appContent = document.getElementById('app-content');
  if (!appContent) return;

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
      <h2>收據清單</h2>
      <table class="receipt-table">
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
    const snap = await getDocs(query(collection(db, 'receipts'), orderBy('createdAt', 'desc')));
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
  } catch {
    receiptsBody.innerHTML = '<tr><td colspan="6">讀取失敗</td></tr>';
    showToast('讀取收據失敗', 'error');
  }
}

function showReceiptDetail(id, data, db, appState, hasPermission, showToast) {
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

export function initReceiptsModule({ db, storage, appState, hasPermission, showToast }) {
  window.addEventListener('pageChange', async (event) => {
    if (event.detail.page !== 'list' && event.detail.page !== 'upload') return;
    renderReceiptsPage(appState, hasPermission);

    if (event.detail.page === 'list') {
      await loadReceipts(db, appState, hasPermission, showToast);
    }

    document.getElementById('receipt-upload-form')?.addEventListener('submit', async (submitEvent) => {
      submitEvent.preventDefault();
      const file = document.getElementById('receipt-file').files[0];
      if (!file || !appState.currentUser) return;

      const fileRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
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
    });
  });

  window.loadReceipts = () => loadReceipts(db, appState, hasPermission, showToast);
  return { ready: true, name: 'receipts' };
}
