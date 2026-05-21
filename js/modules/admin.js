import { collection, getDocs, setDoc, getDoc, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allMembers = [];

function renderAdminPage() {
  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  appContent.innerHTML = `
    <section id="section-admin" class="page-section">
      <h2>權限管理</h2>
      <div class="admin-toolbar">
        <input id="member-search" placeholder="搜尋姓名或 Email">
        <select id="role-filter">
          <option value="all">全部</option>
          <option value="guest">guest</option>
          <option value="member">member</option>
          <option value="finance">finance</option>
          <option value="developer">developer</option>
        </select>
        <button id="add-member-btn">新增成員</button>
      </div>
      <table class="member-table">
        <tbody id="members-body"></tbody>
      </table>

      <div id="member-modal" class="modal" style="display:none;">
        <div class="modal-content">
          <h3 id="modal-title">新增成員</h3>
          <form id="member-form">
            <input id="m-email" placeholder="Email" required>
            <input id="m-name" placeholder="姓名" required>
            <select id="m-role">
              <option value="guest">guest</option>
              <option value="member" selected>member</option>
              <option value="finance">finance</option>
              <option value="developer">developer</option>
            </select>
            <select id="m-status">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
            <input type="hidden" id="edit-mode" value="false">
            <button type="submit">儲存</button>
          </form>
          <div class="modal-footer">
            <button id="close-member-modal">關閉</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderMembers(filteredMembers) {
  const body = document.getElementById('members-body');
  if (!body) return;
  body.innerHTML = '';

  filteredMembers.forEach((member) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${member.Name || ''}</td>
      <td>${member.id}</td>
      <td><span class="badge badge-role-${member.Role}">${member.Role}</span></td>
      <td><span class="badge badge-status-${member.Status}">${member.Status}</span></td>
      <td>
        <button class="action-btn edit-btn" data-id="${member.id}">編輯</button>
        <button class="action-btn toggle-btn" data-id="${member.id}">
          ${member.Status === 'active' ? '停用' : '啟用'}
        </button>
      </td>
    `;
    body.appendChild(row);
  });

  body.querySelectorAll('.edit-btn').forEach((button) => {
    button.addEventListener('click', () => window.openEditMember(button.dataset.id));
  });
  body.querySelectorAll('.toggle-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const member = allMembers.find((item) => item.id === button.dataset.id);
      if (member) window.toggleMemberStatus(member.id, member.Status);
    });
  });
}

async function loadMembers(db) {
  const snap = await getDocs(collection(db, 'member'));
  allMembers = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  renderMembers(allMembers);
}

function applyMemberFilters() {
  const search = document.getElementById('member-search')?.value.toLowerCase() || '';
  const role = document.getElementById('role-filter')?.value || 'all';
  const filtered = allMembers.filter((member) => {
    const name = (member.Name || '').toLowerCase();
    const email = (member.id || '').toLowerCase();
    return (name.includes(search) || email.includes(search)) && (role === 'all' || member.Role === role);
  });
  renderMembers(filtered);
}

export function initAdminModule({ db, appState, hasPermission, showToast }) {
  window.addEventListener('pageChange', async (event) => {
    if (event.detail.page !== 'admin') return;
    renderAdminPage();
    await loadMembers(db);

    document.getElementById('member-search')?.addEventListener('input', applyMemberFilters);
    document.getElementById('role-filter')?.addEventListener('change', applyMemberFilters);

    document.getElementById('add-member-btn')?.addEventListener('click', () => {
      document.getElementById('member-form').reset();
      document.getElementById('edit-mode').value = 'false';
      document.getElementById('m-email').disabled = false;
      document.getElementById('modal-title').textContent = '新增成員';
      document.getElementById('member-modal').style.display = 'flex';
    });

    document.getElementById('close-member-modal')?.addEventListener('click', () => {
      document.getElementById('member-modal').style.display = 'none';
    });

    document.getElementById('member-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const isEdit = document.getElementById('edit-mode').value === 'true';
      const email = document.getElementById('m-email').value;
      const name = document.getElementById('m-name').value;
      const role = document.getElementById('m-role').value;
      const status = document.getElementById('m-status').value;

      if (isEdit) {
        const target = allMembers.find((member) => member.id === email);
        const developers = allMembers.filter((member) => member.Role === 'developer' && member.Status === 'active');
        if (target?.Role === 'developer' && role !== 'developer' && developers.length <= 1) {
          alert('不可移除最後一個有效的 Developer');
          return;
        }
        if (target?.Role === 'developer' && status === 'inactive' && developers.length <= 1) {
          alert('不可停用最後一個 Developer');
          return;
        }
      } else {
        const check = await getDoc(doc(db, 'member', email));
        if (check.exists()) {
          alert('此 Email 已存在');
          return;
        }
      }

      await setDoc(doc(db, 'member', email), { Name: name, Role: role, Status: status, Email: email });
      document.getElementById('member-modal').style.display = 'none';
      await loadMembers(db);
    });
  });

  window.openEditMember = async (id) => {
    const member = allMembers.find((item) => item.id === id);
    if (!member) return;
    document.getElementById('edit-mode').value = 'true';
    document.getElementById('m-email').value = member.id;
    document.getElementById('m-email').disabled = true;
    document.getElementById('m-name').value = member.Name;
    document.getElementById('m-role').value = member.Role;
    document.getElementById('m-status').value = member.Status;
    document.getElementById('modal-title').textContent = '編輯成員';
    document.getElementById('member-modal').style.display = 'flex';
  };

  window.toggleMemberStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const developers = allMembers.filter((member) => member.Role === 'developer' && member.Status === 'active');
    const target = allMembers.find((member) => member.id === id);
    if (target?.Role === 'developer' && newStatus === 'inactive' && developers.length <= 1) {
      alert('不可停用最後一個 Developer');
      return;
    }
    await updateDoc(doc(db, 'member', id), { Status: newStatus });
    await loadMembers(db);
  };

  return { ready: true, name: 'admin' };
}
