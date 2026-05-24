import { useState, useEffect } from 'react';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { subscribeEvents, subscribeAttendance, subscribeRsvps } from '../schedule.service';
import { fetchMembers } from '../../../features/members/members.service';
import { getDaysInMonth, getMonthStartWeekday, getMonthLabel } from '../../../lib/date/range';
import { isToday, getEventsForDate } from '../schedule.utils';
import type { ScheduleEvent, AttendanceResponse, Rsvp, Member } from '../../../types';
import DayModal from './DayModal';
import EventFormModal from './EventFormModal';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CalendarGrid() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceResponse[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { checkPermission } = useCurrentUser();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);

  const canViewAttendance = checkPermission('can_view_attendance');
  const canCreateEvents = checkPermission('can_create_events');
  const canManageEvents = checkPermission('can_manage_events');

  useEffect(() => {
    const unsubEvents = subscribeEvents(setEvents);
    const unsubAtt = subscribeAttendance(setAttendance);
    const unsubRsvps = subscribeRsvps(setRsvps);

    fetchMembers()
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => {
      unsubEvents();
      unsubAtt();
      unsubRsvps();
    };
  }, []);

  const activeMembers = members.filter((m) => m.status === 'active');

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const days = getDaysInMonth(year, month);
  const startWeekday = getMonthStartWeekday(year, month);

  if (loading) return <div className="loading-indicator">載入行事曆…</div>;

  return (
    <div className="calendar-container">
      <div className="cal-header">
        <div className="cal-title-block">
          <div className="text-muted">出席日曆</div>
          <div className="cal-month-row">
            <button type="button" className="cal-nav-btn" onClick={prevMonth}>‹</button>
            <h2 className="cal-month-label">{getMonthLabel(year, month)}</h2>
            <button type="button" className="cal-nav-btn" onClick={nextMonth}>›</button>
          </div>
        </div>
        {(canCreateEvents || canManageEvents) && (
          <button type="button" className="btn btn-primary cal-create-btn" onClick={() => setShowEventForm(true)}>
            + 新增活動
          </button>
        )}
      </div>

      <div className="cal-legend">
        <span><i className="legend-dot legend-dot-today" />今天</span>
        <span><i className="legend-dot legend-dot-selected" />已選日期</span>
        <span><i className="legend-dot legend-dot-event" />有活動</span>
        {canViewAttendance && <span><i className="legend-dot legend-dot-attendance" />出席數</span>}
      </div>

      <div className="cal-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="cal-weekday">{label}</div>
        ))}
      </div>

      <div className="cal-grid">
        {Array.from({ length: startWeekday }).map((_, i) => (
          <div key={`empty-${i}`} className="cal-cell cal-empty" />
        ))}

        {days.map((dateStr) => {
          const dayNum = parseInt(dateStr.split('-')[2], 10);
          const dayEvents = getEventsForDate(events, dateStr);
          const dayAttendance = attendance.filter((a) => a.date === dateStr);
          const yesCount = dayAttendance.filter((a) => a.response === 'yes').length;
          const todayMatch = isToday(dateStr);
          const hasEvents = dayEvents.length > 0;
          const selected = selectedDate === dateStr;

          return (
            <button
              type="button"
              key={dateStr}
              className={`cal-cell${todayMatch ? ' cal-today' : ''}${selected ? ' cal-selected' : ''}${hasEvents ? ' cal-has-events' : ''}`}
              onClick={() => setSelectedDate(dateStr)}
            >
              <span className="cal-date-row">
                <span className="cal-date-num">{dayNum}</span>
                {yesCount > 0 && canViewAttendance && (
                  <span className="cal-going-count">👥 {yesCount}</span>
                )}
              </span>
              <div className="cal-event-list">
                {dayEvents.slice(0, 2).map((ev) => (
                  <span key={ev.id} className="cal-event-name">• {ev.title}</span>
                ))}
                {dayEvents.length > 2 && <span className="cal-event-more">+{dayEvents.length - 2}</span>}
                {!hasEvents && <span className="cal-empty-label">—</span>}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <DayModal
          date={selectedDate}
          events={events.filter((e) => e.date === selectedDate)}
          attendance={attendance.filter((a) => a.date === selectedDate)}
          rsvps={rsvps}
          members={activeMembers}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {showEventForm && (
        <EventFormModal
          initialDate={selectedDate ?? days[0]}
          event={null}
          onClose={() => setShowEventForm(false)}
          onDone={() => setShowEventForm(false)}
        />
      )}
    </div>
  );
}
