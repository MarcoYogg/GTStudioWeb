import { useState } from 'react';
import { useAuthStore } from '../../../features/auth/auth.store';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { upsertAttendance, upsertRsvp, deleteEvent } from '../schedule.service';
import { useUiStore } from '../../../store/ui.store';
import type { ScheduleEvent, AttendanceResponse, Rsvp, Member, AttendanceResponseValue } from '../../../types';
import EventFormModal from './EventFormModal';

interface Props {
  date: string;
  events: ScheduleEvent[];
  attendance: AttendanceResponse[];
  rsvps: Rsvp[];
  members: Member[];
  onClose: () => void;
}

export default function DayModal({ date, events, attendance, rsvps, members, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const addToast = useUiStore((s) => s.addToast);
  const { checkPermission } = useCurrentUser();
  const [working, setWorking] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  const canViewAttendance = checkPermission('can_view_attendance');
  const canRsvp = checkPermission('can_rsvp');
  const canCreateEvents = checkPermission('can_create_events');
  const canManageEvents = checkPermission('can_manage_events');

  const [y, m, d] = date.split('-').map(Number);
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const dateObj = new Date(y, m - 1, d);

  const myAttendance = attendance.find((a) => a.userEmail === user?.email);
  const myResponse = myAttendance?.response ?? null;

  const getRsvpStats = (eventId: string) => {
    const eventRsvps = rsvps.filter((r) => r.eventId === eventId);
    return {
      going: eventRsvps.filter((r) => r.status === 'going').length,
      maybe: eventRsvps.filter((r) => r.status === 'maybe').length,
      notGoing: eventRsvps.filter((r) => r.status === 'not_going').length,
      myStatus: eventRsvps.find((r) => r.userEmail === user?.email)?.status ?? null,
    };
  };

  const handleRsvp = async (response: AttendanceResponseValue) => {
    if (!user?.email) return;
    setWorking(true);
    try {
      await upsertAttendance({ date, userEmail: user.email, userName: user.displayName ?? user.email, response });
      addToast(response === 'yes' ? '已標記為出席' : '已標記為缺席', 'success');
    } catch {
      addToast('標記失敗', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleEventRsvp = async (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
    if (!user?.email) return;
    setWorking(true);
    try {
      await upsertRsvp({ eventId, userEmail: user.email, status });
      if (status === 'going') addToast('已報名參加', 'success');
      else if (status === 'maybe') addToast('已標記可能', 'success');
      else addToast('已報名不參加', 'success');
    } catch {
      addToast('更新失敗', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleDeleteEvent = async (evt: ScheduleEvent) => {
    if (!window.confirm('確定刪除「' + evt.title + '」？')) return;
    setWorking(true);
    try {
      await deleteEvent(evt.id);
      addToast('已刪除活動', 'success');
    } catch {
      addToast('刪除失敗', 'error');
    } finally {
      setWorking(false);
    }
  };

  if (editingEvent) {
    return (
      <EventFormModal
        initialDate={editingEvent.date}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onDone={() => setEditingEvent(null)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{m}月{d}日 {weekdays[dateObj.getDay()]}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {canViewAttendance && (
            <div className="day-section">
              <h4>出席狀態</h4>
              <div className="member-presence-list">
                {members.length === 0 && <p className="text-muted">無活躍成員</p>}
                {members.map((member) => {
                  const resp = attendance.find((a) => a.userEmail === member.email);
                  const isMe = member.email === user?.email;
                  return (
                    <div key={member.email} className={`presence-row${isMe ? ' presence-me' : ''}`}>
                      <span className="presence-name">{member.name || member.email}</span>
                      <span className={`presence-badge presence-${resp?.response ?? 'none'}`}>
                        {resp?.response === 'yes' ? '✅ 出席' : resp?.response === 'no' ? '❌ 缺席' : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {canRsvp && (
            <div className="day-section">
              <h4>我的出席</h4>
              <div className="rsvp-buttons">
                <button type="button" className={`btn ${myResponse === 'yes' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleRsvp('yes')} disabled={working}>
                  ✅ 出席
                </button>
                <button type="button" className={`btn ${myResponse === 'no' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => handleRsvp('no')} disabled={working}>
                  ❌ 缺席
                </button>
              </div>
            </div>
          )}

          <div className="day-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
              <h4 style={{ margin: 0 }}>活動 {events.length > 0 && <span className="count-badge">{events.length}</span>}</h4>
              {(canCreateEvents || canManageEvents) && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditingEvent(null)}>
                  + 新增活動
                </button>
              )}
            </div>
            {events.length === 0 && <p className="text-muted">當天無活動</p>}
            {events.map((ev) => {
              const stats = getRsvpStats(ev.id);
              const canEdit = (canManageEvents || canCreateEvents) && ev.createdBy === user?.email;
              return (
                <div key={ev.id} className="event-card">
                  <div className="event-info">
                    <div className="event-title-row">
                      <strong>{ev.title}</strong>
                      {canEdit && (
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditingEvent(ev)}>✏️</button>
                      )}
                    </div>
                    {(ev.timeStart || ev.timeEnd) && (
                      <span className="event-time">{ev.timeStart}{ev.timeEnd ? ` - ${ev.timeEnd}` : ''}</span>
                    )}
                    {ev.location && <span className="event-location">📍 {ev.location}</span>}
                    {ev.description && <p className="event-desc">{ev.description}</p>}

                    {canRsvp && (
                      <div className="event-rsvp">
                        <div className="event-rsvp-buttons">
                          <button type="button" className={`rsvp-btn ${stats.myStatus === 'going' ? 'rsvp-active-going' : ''}`} onClick={() => handleEventRsvp(ev.id, 'going')} disabled={working}>✅ 參加 ({stats.going})</button>
                          <button type="button" className={`rsvp-btn ${stats.myStatus === 'maybe' ? 'rsvp-active-maybe' : ''}`} onClick={() => handleEventRsvp(ev.id, 'maybe')} disabled={working}>❓ 可能 ({stats.maybe})</button>
                          <button type="button" className={`rsvp-btn ${stats.myStatus === 'not_going' ? 'rsvp-active-notgoing' : ''}`} onClick={() => handleEventRsvp(ev.id, 'not_going')} disabled={working}>❌ 不參加 ({stats.notGoing})</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <div className="event-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDeleteEvent(ev)}>刪除</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
