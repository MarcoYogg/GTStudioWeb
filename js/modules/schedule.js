import { collection, addDoc, deleteDoc, doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const FULL_WEEKDAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
const QUICK_LOCATION_OPTIONS = ['GT Studio', '外出', '線上'];

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let allPresence = [];
let allEvents = [];
let allRsvp = [];
let scheduleInitialized = false;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getCalendarDateLabel(dateStr) {
  if (!dateStr) return '';

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${month}月${day}日 ${FULL_WEEKDAY_LABELS[date.getDay()]}`;
}

function renderSchedulePage(appState, hasPermission) {
  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  appContent.innerHTML = `
    <section id="section-schedule" class="page-section">
      <div class="schedule-toolbar">
        <button id="cal-prev" class="cal-nav-btn" type="button" aria-label="上一個月份">‹</button>
        <span id="cal-month-label"></span>
        <button id="cal-next" class="cal-nav-btn" type="button" aria-label="下一個月份">›</button>
        <button id="create-event-btn" class="primary-btn schedule-create-btn" type="button" ${hasPermission('can_create_events') ? '' : 'style="display:none;"'}>新增活動</button>
      </div>
      <div id="calendar-grid" class="calendar-grid"></div>
    </section>

    <div id="day-modal" class="modal" style="display:none;">
      <div class="modal-content day-modal-content">
        <h3 id="day-modal-title"></h3>
        <div id="day-modal-body"></div>
        <div class="modal-footer">
          <button id="close-day-modal" type="button">關閉</button>
        </div>
      </div>
    </div>

    <div id="event-modal" class="modal" style="display:none;">
      <div class="modal-content quick-event-modal">
        <div class="quick-event-header">
          <div>
            <p class="quick-event-eyebrow">快速建立</p>
            <h3 id="event-modal-title">新增活動</h3>
            <p id="event-modal-subtitle" class="quick-event-subtitle">先填必填欄位，其他資訊可以保持精簡。</p>
          </div>
          <button id="close-event-modal" class="quick-event-close" type="button" aria-label="關閉新增活動視窗">×</button>
        </div>

        <form id="event-form" class="quick-event-form">
          <div class="quick-event-main-fields">
            <label class="quick-field">
              <span>活動標題</span>
              <input id="ev-title" type="text" placeholder="例如：拍攝日、排練、meeting" required>
            </label>

            <div class="quick-event-row">
              <label class="quick-field">
                <span>日期</span>
                <input id="ev-date" type="date" required>
              </label>
              <label class="quick-field">
                <span>開始</span>
                <input id="ev-time-start" type="time">
              </label>
              <label class="quick-field">
                <span>結束</span>
                <input id="ev-time-end" type="time">
              </label>
            </div>
          </div>

          <div class="quick-event-location-panel">
            <div class="quick-field">
              <span>地點</span>
              <input id="ev-location" type="text" placeholder="可直接輸入，或點下面快捷鍵">
            </div>
            <div class="quick-location-chips">
              ${QUICK_LOCATION_OPTIONS.map((location) => `<button type="button" class="location-chip" data-action="set-location" data-location="${location}">${location}</button>`).join('')}
            </div>
          </div>

          <details class="quick-event-details">
            <summary>補充描述（可略過）</summary>
            <label class="quick-field quick-field-textarea">
              <span>活動描述</span>
              <textarea id="ev-desc" rows="3" placeholder="例如：集合時間、注意事項、器材需求"></textarea>
            </label>
          </details>

          <div class="modal-footer quick-event-footer">
            <button class="cancel-btn" id="cancel-event-btn" type="button">取消</button>
            <button class="primary-btn quick-submit-btn" type="submit">建立活動</button>
          </div>
        </form>
      </div>
    </div>
  `;

  if (!appState.currentUser) {
    const grid = document.getElementById('calendar-grid');
    if (grid) {
      grid.insertAdjacentHTML('beforebegin', '<p class="login-hint">登入後可回覆出席與活動 RSVP。</p>');
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.style.display = 'none';
  if (modalId === 'day-modal') {
    delete modal.dataset.openDate;
  }
}

function refreshOpenDayModal() {
  const dayModal = document.getElementById('day-modal');
  if (dayModal && dayModal.style.display !== 'none' && dayModal.dataset.openDate) {
    renderDayModal(dayModal.dataset.openDate, window.__GT?.appState);
  }
}

function buildCalendarCellHtml({ day, yesCount, eventsForCell }) {
  return `
    <span class="cal-date-num">${day}</span>
    ${yesCount > 0 ? `<span class="cal-going-count">會到 ${yesCount} 人</span>` : ''}
    ${eventsForCell.map((eventItem) => `<span class="cal-event-name">● ${escapeHtml(eventItem.title)}</span>`).join('')}
  `;
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
  WEEKDAY_LABELS.forEach((dayName) => {
    const header = document.createElement('div');
    header.className = 'cal-header-cell';
    header.textContent = dayName;
    grid.appendChild(header);
  });

  for (let index = 0; index < firstDay; index += 1) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-cell cal-empty';
    grid.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const yesCount = allPresence.filter((row) => row.date === dateStr && row.response === 'yes').length;
    const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === day;
    const myResponse = appState.currentUser
      ? (allPresence.find((row) => row.date === dateStr && row.userEmail === appState.currentUser.email)?.response || null)
      : null;
    const eventsForCell = allEvents.filter((eventItem) => eventItem.date === dateStr);

    const cell = document.createElement('div');
    cell.className = `cal-cell${isToday ? ' cal-today' : ''}${myResponse === 'yes' ? ' cal-going' : myResponse === 'no' ? ' cal-not-going' : ''}`;
    cell.dataset.date = dateStr;
    cell.innerHTML = buildCalendarCellHtml({ day, yesCount, eventsForCell });
    cell.addEventListener('click', () => openDayModal(dateStr, appState));
    grid.appendChild(cell);
  }
}

function openDayModal(dateStr, appState) {
  const dayModal = document.getElementById('day-modal');
  if (!dayModal) return;

  dayModal.dataset.openDate = dateStr;
  renderDayModal(dateStr, appState);
  dayModal.style.display = 'flex';
}

function buildPresenceSection(dateStr, appState, myResponse) {
  const presenceForDay = allPresence.filter((row) => row.date === dateStr);
  let presenceHtml = '';

  if (appState.currentPermissions.can_view_attendance) {
    presenceHtml = '<div class="day-section"><h4>出席狀態</h4><div class="member-presence-list">';
    const activeMembers = appState.allMembers.filter((member) => member.Status === 'active');

    activeMembers.forEach((member) => {
      const response = presenceForDay.find((row) => row.userEmail === member.id);
      const status = response?.response || 'unknown';
      const emoji = status === 'yes' ? '✅' : status === 'no' ? '❌' : '❔';
      presenceHtml += `<div class="member-presence-item"><span>${emoji}</span><span>${escapeHtml(member.Name)}</span></div>`;
    });

    presenceHtml += '</div>';
  } else {
    presenceHtml = '<div class="day-section">';
  }

  if (appState.currentUser && appState.currentPermissions.can_rsvp) {
    presenceHtml += `
      <div class="my-vote-row">
        <span>我的狀態：</span>
        <div class="vote-buttons">
          <button class="vote-btn vote-btn-yes ${myResponse === 'yes' ? 'selected' : ''}" type="button" data-action="presence" data-date="${dateStr}" data-response="yes">會到</button>
          <button class="vote-btn vote-btn-no ${myResponse === 'no' ? 'selected' : ''}" type="button" data-action="presence" data-date="${dateStr}" data-response="no">不到</button>
        </div>
      </div>
    `;
  }

  presenceHtml += '</div>';
  return presenceHtml;
}

function buildEventSectionHeader(dateStr, appState) {
  if (!appState.currentPermissions.can_create_events) {
    return '<h4>活動</h4>';
  }

  return `
    <h4>
      活動
      <button class="inline-add-btn" type="button" data-action="open-event-modal" data-date="${dateStr}">新增</button>
    </h4>
  `;
}

function buildEventCardHtml(eventItem, appState) {
  const goingCount = allRsvp.filter((row) => row.eventId === eventItem.id && row.status === 'going').length;
  const maybeCount = allRsvp.filter((row) => row.eventId === eventItem.id && row.status === 'maybe').length;
  const notGoingCount = allRsvp.filter((row) => row.eventId === eventItem.id && row.status === 'not_going').length;
  const timeLabel = eventItem.timeStart ? `⏰ ${escapeHtml(eventItem.timeStart)}${eventItem.timeEnd ? ` - ${escapeHtml(eventItem.timeEnd)}` : ''}` : '';
  const isCreator = appState.currentUser && appState.currentUser.email === eventItem.createdBy;
  const myRsvp = appState.currentUser
    ? (allRsvp.find((row) => row.eventId === eventItem.id && row.userEmail === appState.currentUser.email)?.status || null)
    : null;

  return `
    <div class="event-card">
      <div class="event-card-header">
        <span class="event-card-title">${escapeHtml(eventItem.title)}</span>
        ${isCreator ? `<button class="delete-event-btn" type="button" data-action="delete-event" data-event-id="${eventItem.id}">刪除</button>` : ''}
      </div>
      ${timeLabel ? `<div class="event-meta">${timeLabel}</div>` : ''}
      ${eventItem.location ? `<div class="event-meta">📍 ${escapeHtml(eventItem.location)}</div>` : ''}
      ${eventItem.description ? `<div class="event-meta">${escapeHtml(eventItem.description)}</div>` : ''}
      <div class="event-rsvp-counts">會到 ${goingCount} 人 ｜ 考慮中 ${maybeCount} 人 ｜ 不到 ${notGoingCount} 人</div>
      ${appState.currentUser ? `
        <div class="rsvp-buttons">
          <button class="rsvp-btn ${myRsvp === 'going' ? 'selected' : ''}" type="button" data-action="rsvp" data-event-id="${eventItem.id}" data-status="going">會到</button>
          <button class="rsvp-btn ${myRsvp === 'maybe' ? 'selected' : ''}" type="button" data-action="rsvp" data-event-id="${eventItem.id}" data-status="maybe">考慮中</button>
          <button class="rsvp-btn rsvp-no ${myRsvp === 'not_going' ? 'selected' : ''}" type="button" data-action="rsvp" data-event-id="${eventItem.id}" data-status="not_going">不到</button>
        </div>
      ` : ''}
    </div>
  `;
}

function buildEventsSection(dateStr, appState) {
  const eventsForDay = allEvents.filter((eventItem) => eventItem.date === dateStr);
  let eventsHtml = `<div class="day-section">${buildEventSectionHeader(dateStr, appState)}`;

  if (eventsForDay.length === 0) {
    eventsHtml += '<p class="no-events">當天沒有活動，可以直接新增。</p>';
  } else {
    eventsForDay.forEach((eventItem) => {
      eventsHtml += buildEventCardHtml(eventItem, appState);
    });
  }

  eventsHtml += '</div>';
  return eventsHtml;
}

function renderDayModal(dateStr, appState) {
  const title = document.getElementById('day-modal-title');
  const body = document.getElementById('day-modal-body');
  if (!title || !body) return;

  const presenceForDay = allPresence.filter((row) => row.date === dateStr);
  const myResponse = appState.currentUser
    ? (presenceForDay.find((row) => row.userEmail === appState.currentUser.email)?.response || null)
    : null;

  title.textContent = getCalendarDateLabel(dateStr);
  body.innerHTML = buildPresenceSection(dateStr, appState, myResponse) + buildEventsSection(dateStr, appState);
}

function applyQuickLocation(location) {
  const locationInput = document.getElementById('ev-location');
  if (!locationInput) return;

  locationInput.value = location;
  locationInput.focus();
}

function updateEventModalContext(dateStr) {
  const modalTitle = document.getElementById('event-modal-title');
  const modalSubtitle = document.getElementById('event-modal-subtitle');
  if (!modalTitle || !modalSubtitle) return;

  if (dateStr) {
    modalTitle.textContent = `新增活動：${getCalendarDateLabel(dateStr)}`;
    modalSubtitle.textContent = '日期已帶入，補上標題和時間就能快速建立。';
    return;
  }

  modalTitle.textContent = '新增活動';
  modalSubtitle.textContent = '先填必填欄位，其他資訊可以保持精簡。';
}

function resetEventForm(dateStr) {
  const eventForm = document.getElementById('event-form');
  const eventDateInput = document.getElementById('ev-date');
  if (!eventForm || !eventDateInput) return;

  eventForm.reset();
  if (dateStr) {
    eventDateInput.value = dateStr;
  }
}

function openEventModal(dateStr) {
  const eventModal = document.getElementById('event-modal');
  if (!eventModal) return;

  resetEventForm(dateStr);
  updateEventModalContext(dateStr);
  eventModal.style.display = 'flex';
  document.getElementById('ev-title')?.focus();
}

async function handlePresenceVote({ db, appState, showToast, dateStr, response }) {
  if (!appState.currentUser) {
    showToast('請先登入再回覆出席狀態', 'error');
    return;
  }

  try {
    await setDoc(doc(db, 'scheduleResponses', `${dateStr}_${appState.currentUser.email}`), {
      date: dateStr,
      userEmail: appState.currentUser.email,
      userName: appState.currentUserName || appState.currentUser.email,
      response,
      updatedAt: serverTimestamp()
    });
    showToast('出席狀態已更新', 'success');
  } catch (error) {
    console.error('更新出席狀態失敗', error);
    showToast('更新出席狀態失敗', 'error');
  }
}

async function handleEventRsvp({ db, appState, showToast, eventId, status }) {
  if (!appState.currentUser) {
    showToast('請先登入再回覆活動狀態', 'error');
    return;
  }

  try {
    await setDoc(doc(db, 'rsvp', `${eventId}_${appState.currentUser.email}`), {
      eventId,
      userEmail: appState.currentUser.email,
      status,
      updatedAt: serverTimestamp()
    });
    showToast('活動回覆已更新', 'success');
  } catch (error) {
    console.error('更新活動回覆失敗', error);
    showToast('更新活動回覆失敗', 'error');
  }
}

async function handleDeleteEvent({ db, appState, showToast, eventId }) {
  if (!appState.currentUser) {
    showToast('請先登入再刪除活動', 'error');
    return;
  }

  try {
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (!eventDoc.exists()) {
      showToast('找不到要刪除的活動', 'error');
      return;
    }

    const eventData = eventDoc.data();
    const canDeleteEvent = eventData.createdBy === appState.currentUser.email || appState.currentUserRole === 'developer';
    if (!canDeleteEvent) {
      showToast('你沒有刪除此活動的權限', 'error');
      return;
    }

    if (!window.confirm('確定要刪除這個活動嗎？')) {
      return;
    }

    await deleteDoc(doc(db, 'events', eventId));
    showToast('活動已刪除', 'info');
  } catch (error) {
    console.error('刪除活動失敗', error);
    showToast('刪除活動失敗', 'error');
  }
}

function bindModalBackdropClose(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.addEventListener('click', (clickEvent) => {
    if (clickEvent.target === modal) {
      closeModal(modalId);
    }
  });
}

function bindDayModalActions({ db, appState, showToast }) {
  const dayModalBody = document.getElementById('day-modal-body');
  if (!dayModalBody) return;

  dayModalBody.addEventListener('click', async (clickEvent) => {
    const actionButton = clickEvent.target.closest('[data-action]');
    if (!actionButton) return;

    if (actionButton.dataset.action === 'presence') {
      await handlePresenceVote({
        db,
        appState,
        showToast,
        dateStr: actionButton.dataset.date,
        response: actionButton.dataset.response
      });
      return;
    }

    if (actionButton.dataset.action === 'rsvp') {
      await handleEventRsvp({
        db,
        appState,
        showToast,
        eventId: actionButton.dataset.eventId,
        status: actionButton.dataset.status
      });
      return;
    }

    if (actionButton.dataset.action === 'delete-event') {
      await handleDeleteEvent({
        db,
        appState,
        showToast,
        eventId: actionButton.dataset.eventId
      });
      return;
    }

    if (actionButton.dataset.action === 'open-event-modal') {
      openEventModal(actionButton.dataset.date);
    }
  });
}

function bindEventFormShortcuts() {
  const eventForm = document.getElementById('event-form');
  if (!eventForm) return;

  eventForm.addEventListener('click', (clickEvent) => {
    const actionButton = clickEvent.target.closest('[data-action="set-location"]');
    if (!actionButton) return;
    applyQuickLocation(actionButton.dataset.location);
  });
}

function bindScheduleControls(db, appState, showToast) {
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    calendarMonth -= 1;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear -= 1;
    }
    renderCalendar(appState);
  });

  document.getElementById('cal-next')?.addEventListener('click', () => {
    calendarMonth += 1;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear += 1;
    }
    renderCalendar(appState);
  });

  document.getElementById('create-event-btn')?.addEventListener('click', () => openEventModal(null));
  document.getElementById('close-day-modal')?.addEventListener('click', () => closeModal('day-modal'));
  document.getElementById('close-event-modal')?.addEventListener('click', () => closeModal('event-modal'));
  document.getElementById('cancel-event-btn')?.addEventListener('click', () => closeModal('event-modal'));

  document.getElementById('event-form')?.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    if (!appState.currentUser) {
      showToast('請先登入再建立活動', 'error');
      return;
    }

    const submitButton = submitEvent.target.querySelector('[type=submit]');
    submitButton.disabled = true;

    try {
      await addDoc(collection(db, 'events'), {
        title: document.getElementById('ev-title').value.trim(),
        date: document.getElementById('ev-date').value,
        timeStart: document.getElementById('ev-time-start').value,
        timeEnd: document.getElementById('ev-time-end').value,
        location: document.getElementById('ev-location').value.trim(),
        description: document.getElementById('ev-desc').value.trim(),
        createdBy: appState.currentUser.email,
        createdAt: serverTimestamp()
      });
      showToast('活動已建立', 'success');
      closeModal('event-modal');
      submitEvent.target.reset();
    } catch (error) {
      console.error('建立活動失敗', error);
      showToast('建立活動失敗', 'error');
    } finally {
      submitButton.disabled = false;
    }
  });

  bindDayModalActions({ db, appState, showToast });
  bindEventFormShortcuts();
  bindModalBackdropClose('day-modal');
  bindModalBackdropClose('event-modal');
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

  return { ready: true, name: 'schedule' };
}
