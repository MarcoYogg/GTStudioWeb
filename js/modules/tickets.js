import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

let allTickets = [];
let ticketFilter = 'all';
let ticketsInitialized = false;

function renderTicketsPage() {
  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  appContent.innerHTML = `
    <section id="section-tickets" class="page-section">
      <h2>Tickets</h2>
      <div class="tk-filter-bar">
        <button class="tk-filter-btn active" data-filter="all">All</button>
        <button class="tk-filter-btn" data-filter="open">Open</button>
        <button class="tk-filter-btn" data-filter="in_progress">In Progress</button>
        <button class="tk-filter-btn" data-filter="resolved">Resolved</button>
      </div>
      <form id="ticket-form">
        <input id="tk-type" placeholder="類型" required>
        <input id="tk-title" placeholder="標題" required>
        <textarea id="tk-desc" placeholder="描述" required></textarea>
        <input id="tk-priority" placeholder="優先級" value="medium" required>
        <input id="tk-photo" type="file" accept="image/*">
        <button id="tk-submit" type="submit">提交 Ticket</button>
      </form>
      <div id="tickets-list">載入中...</div>
    </section>
  `;
}

function renderTickets(appState, hasPermission) {
  const list = document.getElementById('tickets-list');
  if (!list) return;

  const filtered = ticketFilter === 'all' ? allTickets : allTickets.filter((ticket) => ticket.status === ticketFilter);
  if (filtered.length === 0) {
    list.innerHTML = '<p style="color:#aaa;">目前沒有 Ticket</p>';
    return;
  }

  const typeEmoji = { bug: '🐛', feature: '✨', improvement: '🔧' };
  const priorityClass = { low: 'priority-low', medium: 'priority-medium', high: 'priority-high' };
  const statusLabel = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' };

  list.innerHTML = filtered.map((ticket) => {
    const canChangeStatus = hasPermission('can_manage_tickets');
    const canDelete = appState.currentUser && (appState.currentUser.email === ticket.createdBy || hasPermission('can_manage_tickets'));
    const date = ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : '';
    const statusOptions = ['open', 'in_progress', 'resolved']
      .filter((status) => status !== ticket.status)
      .map((status) => `<button class="tk-status-btn" onclick="changeTicketStatus('${ticket.id}', '${status}')">${statusLabel[status]}</button>`)
      .join('');
    const photoHTML = ticket.photoUrl ? `<div class="ticket-attachment"><a href="${ticket.photoUrl}" target="_blank"><img src="${ticket.photoUrl}" alt="Attachment"></a></div>` : '';
    const commentsHTML = (ticket.comments || []).map((comment) => `
      <div class="comment-item">
        <div class="comment-meta">
          <span class="comment-user">${comment.userName}</span>
          <span>${comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString() : new Date(comment.createdAt).toLocaleString()}</span>
        </div>
        <div class="comment-text">${comment.text}</div>
      </div>
    `).join('');

    return `<div class="ticket-card ticket-status-${ticket.status}">
      <div class="ticket-card-header">
        <span class="ticket-type">${typeEmoji[ticket.type] || '📝'} ${ticket.title}</span>
        <span class="ticket-badge ${priorityClass[ticket.priority] || 'priority-medium'}">${ticket.priority}</span>
      </div>
      <p class="ticket-desc">${ticket.description}</p>
      ${photoHTML}
      <div class="ticket-meta">
        <span class="tk-status-badge tk-status-${ticket.status}">${statusLabel[ticket.status]}</span>
        <span>by ${ticket.submittedBy}</span>
        <span>${date}</span>
      </div>
      <div class="ticket-actions">
        ${canChangeStatus ? statusOptions : ''}
        ${canDelete ? `<button class="tk-delete-btn" onclick="deleteTicket('${ticket.id}')">刪除</button>` : ''}
      </div>
      <div class="ticket-comments-section">
        <div class="comment-list" id="comments-${ticket.id}">
          ${commentsHTML || '<p style="color:#ccc; font-size:0.8em; margin:0;">尚未有留言</p>'}
        </div>
        ${appState.currentUser ? `
          <div class="comment-input-row">
            <input type="text" class="comment-input" id="input-${ticket.id}" placeholder="新增留言或回覆...">
            <button class="comment-submit-btn" onclick="addTicketComment('${ticket.id}')">送出</button>
          </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function loadTickets(db, appState, hasPermission) {
  const snap = await getDocs(query(collection(db, 'tickets'), orderBy('createdAt', 'desc')));
  allTickets = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  renderTickets(appState, hasPermission);
}

export function initTicketsModule({ db, storage, appState, hasPermission, showToast }) {
  window.addEventListener('pageChange', async (event) => {
    if (event.detail.page !== 'tickets') return;
    renderTicketsPage();
    await loadTickets(db, appState, hasPermission);

    document.querySelectorAll('.tk-filter-btn').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.tk-filter-btn').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        ticketFilter = button.getAttribute('data-filter');
        renderTickets(appState, hasPermission);
      });
    });

    document.getElementById('ticket-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!appState.currentUser) { showToast('請先登入', 'error'); return; }
      const submitButton = document.getElementById('tk-submit');
      const photoFile = document.getElementById('tk-photo').files[0];
      submitButton.disabled = true;
      submitButton.textContent = '提交工作中...';

      try {
        let photoUrl = null;
        if (photoFile) {
          const filePath = `tickets/${appState.currentUser.email}/${Date.now()}_${photoFile.name}`;
          const fileRef = ref(storage, filePath);
          await uploadBytes(fileRef, photoFile);
          photoUrl = await getDownloadURL(fileRef);
        }

        await addDoc(collection(db, 'tickets'), {
          type: document.getElementById('tk-type').value,
          title: document.getElementById('tk-title').value,
          description: document.getElementById('tk-desc').value,
          priority: document.getElementById('tk-priority').value,
          photoUrl,
          status: 'open',
          submittedBy: appState.currentUserName || appState.currentUser.email,
          createdBy: appState.currentUser.email,
          createdAt: serverTimestamp(),
          comments: []
        });
        showToast('Ticket 已提交', 'success');
        event.target.reset();
        await loadTickets(db, appState, hasPermission);
      } catch {
        showToast('提交失敗', 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = '提交 Ticket';
      }
    });
  });

  window.changeTicketStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'tickets', id), { status: newStatus });
      showToast('狀態已更新', 'success');
      await loadTickets(db, appState, hasPermission);
    } catch {
      showToast('更新失敗', 'error');
    }
  };

  window.deleteTicket = async (id) => {
    if (!confirm('確定刪除此 Ticket？')) return;
    try {
      await deleteDoc(doc(db, 'tickets', id));
      showToast('已刪除', 'info');
      await loadTickets(db, appState, hasPermission);
    } catch {
      showToast('刪除失敗', 'error');
    }
  };

  window.addTicketComment = async (id) => {
    const input = document.getElementById(`input-${id}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text || !appState.currentUser) return;

    try {
      const ticketSnap = await getDocs(query(collection(db, 'tickets')));
      const ticket = ticketSnap.docs.find((item) => item.id === id);
      const comments = ticket?.data()?.comments || [];
      comments.push({
        userId: appState.currentUser.email,
        userName: appState.currentUserName || appState.currentUser.email,
        text,
        createdAt: new Date()
      });
      await updateDoc(doc(db, 'tickets', id), { comments });
      input.value = '';
      await loadTickets(db, appState, hasPermission);
    } catch {
      showToast('留言發送失敗', 'error');
    }
  };

  if (!ticketsInitialized) {
    ticketsInitialized = true;
    onSnapshot(query(collection(db, 'tickets'), orderBy('createdAt', 'desc')), (snap) => {
      allTickets = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      if (document.getElementById('tickets-list')) renderTickets(appState, hasPermission);
    });
  }

  return { ready: true, name: 'tickets' };
}
