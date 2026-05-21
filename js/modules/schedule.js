import { collection, addDoc, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let allPresence = [];
let allEvents = [];
let allRsvp = [];
let scheduleInitialized = false;

function renderSchedulePage(appState, hasPermission) {
  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  appContent.innerHTML = `
    <section id="section-schedule" class="page-section">
      <div class="schedule-toolbar">
        <button id="cal-prev">‹</button>
        <span id="cal-month-label"></span>
        <button id="cal-next">›</button>
        <button id="create-event-btn" ${hasPermission('can_create_events') ? '' : 'style="display:none;"'}>新增活動</button>
      </div>
      <div id="calendar-grid" class="calendar-grid"></div>
    </section>

    <div id="day-modal" class="modal" style="display:none;">
      <div class="modal-content">
        <h3 id="day-modal-title"></h3>
        <div id="day-modal-body"></div>
        <div class="modal-footer">
          <button id="close-day-modal">關閉</button>
        </div>
      </div>
    </div>

    <div id="event-modal" class="modal" style="display:none;">
      <div class="modal-content">
        <h3>新增活動</h3>
        <form id="event-form">
          <input id="ev-title" placeholder="活動標題" required>
          <input id="ev-date" type="date" required>
          <input id="ev-time-start" placeholder="開始時間">
          <input id="ev-time-end" placeholder="結束時間">
          <input id="ev-location" placeholder="地點">
          <textarea id="ev-desc" placeholder="描述"></textarea>
          <button type="submit">建立</button>
        </form>
        <div class="modal-footer">
          <button id="close-event-modal">關閉</button>
        </div>
      </div>
    </div>
  `;
}

function refreshOpenDayModal() {
  const modal = document.getElementById('day-modal');
  if (modal && modal.style.display !== 'none' && modal.dataset.openDate) {
    renderDayModal(modal.dataset.openDate, window.__GT?.appState);
  }
}

function renderCalendar(appState) {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('cal-month-label');
  if (!grid || !label) return;

  label.textContent = `${calendarYear} 年 ${calendarMonth + 1} 月`;
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const today = new Date();

  grid.innerHTML = '';
  ['日', '一', '二', '三', '四', '五', '六'].forEach((day) => {
    const header = document.createElement('div');
    header.className = 'cal-header-cell';
    header.textContent = day;
    grid.appendChild(header);
  });

  for (let index = 0; index < firstDay; index++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell cal-empty';
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const yesCount = allPresence.filter((row) => row.date === dateStr && row.response === 'yes').length;
    const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === day;
    const myResponse = appState.currentUser ? (allPresence.find((row) => row.date === dateStr && row.userEmail === appState.currentUser.email)?.response || null) : null;
    const eventsForCell = allEvents.filter((event) => event.date === dateStr);

    const cell = document.createElement('div');
    cell.className = `cal-cell${isToday ? ' cal-today' : ''}${myResponse === 'yes' ? ' cal-going' : myResponse === 'no' ? ' cal-not-going' : ''}`;
    cell.innerHTML = `
      <span class="cal-date-num">${day}</span>
      ${yesCount > 0 ? `<span class="cal-going-count">${yesCount}</span>` : ''}
      ${eventsForCell.map((event) => `<span class="cal-event-name">● ${event.title}</span>`).join('')}
    `;
    cell.onclick = () => openDayModal(dateStr, appState);
    grid.appendChild(cell);
  }
}

function openDayModal(dateStr, appState) {
  const modal = document.getElementById('day-modal');
  if (!modal) return;
  modal.dataset.openDate = dateStr;
  renderDayModal(dateStr, appState);
  modal.style.display = 'flex';
}

function renderDayModal(dateStr, appState) {
  const title = document.getElementById('day-modal-title');
  const body = document.getElementById('day-modal-body');
  if (!title || !body) return;

  const [year, month, day] = dateStr.split('-').map(Number);
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const date = new Date(year, month - 1, day);
  title.textContent = `${month}月${day}日 ${weekdays[date.getDay()]}`;

  const presenceForDay = allPresence.filter((row) => row.date === dateStr);
  const myResponse = appState.currentUser ? (presenceForDay.find((row) => row.userEmail === appState.currentUser.email)?.response || null) : null;

  let presenceHTML = '';
  if (appState.currentPermissions.can_view_attendance) {
    presenceHTML = `<div class="day-section"><h4>出席狀態</h4><div class="member-presence-list">`;
    const activeMembers = appState.allMembers.filter((member) => member.Status === 'active');
    activeMembers.forEach((member) => {
      const response = presenceForDay.find((row) => row.userEmail === member.id);
      const status = response?.response || 'unknown';
      const emoji = status === 'yes' ? '✅' : status === 'no' ? '❌' : '❔';
      presenceHTML += `<div class="member-presence-item"><span>${emoji}</span><span>${member.Name}</span></div>`;
    });
    presenceHTML += `</div>`;
  } else {
    presenceHTML = `<div class="day-section">`;
  }

  if (appState.currentUser && appState.currentPermissions.can_rsvp) {
    presenceHTML += `<div class="my-vote-row">
      <span>我的狀態：</span>
      <button class="vote-btn ${myResponse === 'yes' ? 'selected' : ''}" onclick="castPresence('${dateStr}', 'yes')">Going</button>
      <button class="vote-btn ${myResponse === 'no' ? 'selected' : ''}" onclick="castPresence('${dateStr}', 'no')">Not Going</button>
    </div>`;
  }
  presenceHTML += `</div>`;

  let eventsHTML = `<div class="day-section"><h4>活動</h4>`;
  const eventsForDay = allEvents.filter((event) => event.date === dateStr);
  if (eventsForDay.length === 0) {
    eventsHTML += `<p>當天沒有活動</p>`;
  } else {
    eventsForDay.forEach((event) => {
      const goingCount = allRsvp.filter((row) => row.eventId === event.id && row.status === 'going').length;
      const maybeCount = allRsvp.filter((row) => row.eventId === event.id && row.status === 'maybe').length;
      const timeLabel = event.timeStart ? `⏰ ${event.timeStart}${event.timeEnd ? ' – ' + event.timeEnd : ''}` : '';
      const isCreator = appState.currentUser && appState.currentUser.email === event.createdBy;
      const myRsvp = appState.currentUser ? (allRsvp.find((row) => row.eventId === event.id && row.userEmail === appState.currentUser.email)?.status || null) : null;

      eventsHTML += `<div class="event-card">
        <div class="event-card-header">
          <span class="event-card-title">${event.title}</span>
          ${isCreator ? `<button class="delete-event-btn" onclick="deleteEvent('${event.id}')">刪除</button>` : ''}
        </div>
        ${timeLabel ? `<div class="event-meta">${timeLabel}</div>` : ''}
        ${event.location ? `<div class="event-meta">📍 ${event.location}</div>` : ''}
        ${event.description ? `<div class="event-meta">${event.description}</div>` : ''}
        <div class="event-rsvp-counts">👍 ${goingCount} Going ｜ 🤔 ${maybeCount} Maybe</div>
        ${appState.currentUser ? `<div class="rsvp-buttons">
          <button class="rsvp-btn ${myRsvp === 'going' ? 'selected' : ''}" onclick="castRsvp('${event.id}', 'going')">Going</button>
          <button class="rsvp-btn ${myRsvp === 'maybe' ? 'selected' : ''}" onclick="castRsvp('${event.id}', 'maybe')">Maybe</button>
          <button class="rsvp-btn rsvp-no ${myRsvp === 'not_going' ? 'selected' : ''}" onclick="castRsvp('${event.id}', 'not_going')">Not Going</button>
        </div>` : ''}
      </div>`;
    });
  }
  eventsHTML += `</div>`;

  body.innerHTML = presenceHTML + eventsHTML;
}

function bindScheduleControls(db, appState, showToast) {
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear--;
    }
    renderCalendar(appState);
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear++;
    }
    renderCalendar(appState);
  });
  document.getElementById('create-event-btn')?.addEventListener('click', () => openEventModal(null));
  document.getElementById('close-day-modal')?.addEventListener('click', () => { document.getElementById('day-modal').style.display = 'none'; });
  document.getElementById('close-event-modal')?.addEventListener('click', () => { document.getElementById('event-modal').style.display = 'none'; });
  document.getElementById('event-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!appState.currentUser) return;
    const submitButton = event.target.querySelector('[type=submit]');
    submitButton.disabled = true;
    try {
      await addDoc(collection(db, 'events'), {
        title: document.getElementById('ev-title').value,
        date: document.getElementById('ev-date').value,
        timeStart: document.getElementById('ev-time-start').value,
        timeEnd: document.getElementById('ev-time-end').value,
        location: document.getElementById('ev-location').value,
        description: document.getElementById('ev-desc').value,
        createdBy: appState.currentUser.email,
        createdAt: serverTimestamp()
      });
      showToast('活動已建立！', 'success');
      document.getElementById('event-modal').style.display = 'none';
    } catch {
      showToast('建立失敗', 'error');
    } finally {
      submitButton.disabled = false;
    }
  });
}

function openEventModal(dateStr) {
  document.getElementById('event-form')?.reset();
  if (dateStr) document.getElementById('ev-date').value = dateStr;
  document.getElementById('event-modal').style.display = 'flex';
}

export function initScheduleModule({ db, appState, hasPermission, showToast }) {
  window.addEventListener('pageChange', (event) => {
    if (event.detail.page !== 'schedule') return;
    renderSchedulePage(appState, hasPermission);
    bindScheduleControls(db, appState, showToast);
    renderCalendar(appState);
  });

  if (!scheduleInitialized) {
    scheduleInitialized = true;
    onSnapshot(collection(db, 'scheduleResponses'), (snap) => {
      allPresence = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      if (document.getElementById('calendar-grid')) renderCalendar(appState);
      refreshOpenDayModal();
    });
    onSnapshot(collection(db, 'events'), (snap) => {
      allEvents = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      if (document.getElementById('calendar-grid')) renderCalendar(appState);
      refreshOpenDayModal();
    });
    onSnapshot(collection(db, 'rsvp'), (snap) => {
      allRsvp = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      refreshOpenDayModal();
    });
  }

  window.castPresence = async (dateStr, response) => {
    if (!appState.currentUser) return;
    await setDoc(doc(db, 'scheduleResponses', `${dateStr}_${appState.currentUser.email}`), {
      date: dateStr,
      userEmail: appState.currentUser.email,
      userName: appState.currentUserName || appState.currentUser.email,
      response,
      updatedAt: serverTimestamp()
    });
  };
  window.castRsvp = async (eventId, status) => {
    if (!appState.currentUser) return;
    await setDoc(doc(db, 'rsvp', `${eventId}_${appState.currentUser.email}`), {
      eventId,
      userEmail: appState.currentUser.email,
      status,
      updatedAt: serverTimestamp()
    });
  };
  window.deleteEvent = async (eventId) => {
    if (!appState.currentUser) return;
    if (!confirm('確定要刪除這個活動嗎？')) return;
    await deleteDoc(doc(db, 'events', eventId));
    showToast('活動已刪除', 'info');
  };

  return { ready: true, name: 'schedule' };
}
