import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { Ticket, TicketComment, TicketPriority, TicketStatus, TicketType } from '../types';
import {
  addComment,
  createTicket,
  deleteTicket,
  fetchCommentsByTicket,
  fetchTickets,
  updateTicketStatus,
} from '../features/tickets/tickets.service';

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: '待處理',
  in_progress: '處理中',
  resolved: '已完成',
};

const TYPE_LABELS: Record<TicketType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  improvement: 'Improvement',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'resolved'];
const TYPE_OPTIONS: TicketType[] = ['bug', 'feature', 'improvement'];
const PRIORITY_OPTIONS: TicketPriority[] = ['low', 'medium', 'high'];

type TicketFormState = {
  type: TicketType;
  title: string;
  description: string;
  priority: TicketPriority;
};

const INITIAL_FORM: TicketFormState = {
  type: 'bug',
  title: '',
  description: '',
  priority: 'medium',
};

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  return fallback;
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function mapStatusVariant(status: TicketStatus): 'warning' | 'info' | 'success' {
  if (status === 'open') return 'warning';
  if (status === 'in_progress') return 'info';
  return 'success';
}

function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="page-header page-toolbar">
      <div className="stack" style={{ gap: '4px' }}>
        <h1>{title}</h1>
        {description ? <p className="text-muted">{description}</p> : null}
      </div>
      {action ? <div className="page-toolbar-actions">{action}</div> : null}
    </div>
  );
}

function SectionCard({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="section-header">
        <div className="stack" style={{ gap: '4px' }}>
          <h2>{title}</h2>
          {description ? <p className="text-muted">{description}</p> : null}
        </div>
        {action ? <div className="section-header-action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function TicketComposer({
  value,
  submitting,
  onChange,
  onSubmit,
}: {
  value: TicketFormState;
  submitting: boolean;
  onChange: (next: TicketFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <SectionCard title="提交 Ticket" description="先把問題講清楚，後面才不會靠猜。">
      <form onSubmit={onSubmit} className="stack" style={{ gap: '12px' }}>
        <label className="form-field">
          <div className="form-label">Type</div>
          <select className="form-input" value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as TicketType })}>
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>{TYPE_LABELS[type]}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <div className="form-label">Priority</div>
          <select className="form-input" value={value.priority} onChange={(e) => onChange({ ...value, priority: e.target.value as TicketPriority })}>
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <div className="form-label">Title</div>
          <input className="form-input" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder="問題標題" />
        </label>
        <label className="form-field">
          <div className="form-label">Description</div>
          <textarea
            className="form-input"
            rows={6}
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            placeholder="問題描述"
          />
        </label>
        <div className="toolbar-actions-row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

function TicketList({
  tickets,
  loading,
  selectedTicketId,
  statusFilter,
  onFilterChange,
  onSelect,
  onStatusChange,
  onDelete,
}: {
  tickets: Ticket[];
  loading: boolean;
  selectedTicketId: string | null;
  statusFilter: TicketStatus | 'all';
  onFilterChange: (status: TicketStatus | 'all') => void;
  onSelect: (ticketId: string) => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  onDelete: (ticketId: string) => void;
}) {
  const options: Array<TicketStatus | 'all'> = ['all', ...STATUS_OPTIONS];
  const filteredTickets = statusFilter === 'all' ? tickets : tickets.filter((ticket) => ticket.status === statusFilter);

  return (
    <SectionCard title="Ticket 清單" description="按狀態快速過濾，再進入單筆處理。">
      <div className="filter-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {options.map((status) => (
          <button
            type="button"
            key={status}
            className={`btn btn-secondary btn-sm${statusFilter === status ? ' nav-active' : ''}`}
            onClick={() => onFilterChange(status)}
          >
            {status === 'all' ? '全部' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      {loading ? <Loading>載入中…</Loading> : null}
      {!loading && filteredTickets.length === 0 ? <EmptyState message="目前沒有符合條件的 ticket" title="沒有 Ticket" /> : null}
      {!loading && filteredTickets.length > 0 ? (
        <div className="stack" style={{ gap: '12px' }}>
          {filteredTickets.map((ticket) => (
            <article
              key={ticket.id}
              className={`ticket-row card${selectedTicketId === ticket.id ? ' cal-selected' : ''}`}
              style={{ padding: '1rem' }}
              onClick={() => onSelect(ticket.id)}
            >
              <div className="ticket-row-header">
                <div className="stack" style={{ gap: '4px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{ticket.title}</strong>
                    <Badge text={STATUS_LABELS[ticket.status]} variant={mapStatusVariant(ticket.status)} />
                    <Badge text={PRIORITY_LABELS[ticket.priority]} variant={ticket.priority === 'high' ? 'error' : ticket.priority === 'medium' ? 'warning' : 'info'} />
                  </div>
                  <p className="text-muted" style={{ margin: 0 }}>{ticket.description}</p>
                </div>
                <div className="toolbar-actions-row">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onStatusChange(ticket.id, 'in_progress'); }}>In Progress</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onStatusChange(ticket.id, 'resolved'); }}>Resolved</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(ticket.id); }}>Delete</button>
                </div>
              </div>
              <div className="ticket-meta-row">
                <span>by {ticket.submittedBy ?? ticket.createdBy}</span>
                <span>{formatDate(ticket.createdAt)}</span>
                <span>{TYPE_LABELS[ticket.type]}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </SectionCard>
  );
}

function CommentPanel({
  ticket,
  comments,
  commentText,
  commentSubmitting,
  onCommentTextChange,
  onCommentSubmit,
}: {
  ticket: Ticket | null;
  comments: TicketComment[];
  commentText: string;
  commentSubmitting: boolean;
  onCommentTextChange: (value: string) => void;
  onCommentSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <SectionCard title="留言" description={ticket ? `目前選取：${ticket.title}` : '請先選擇一個 ticket'}>
      {!ticket ? (
        <EmptyState message="請先選擇一個 ticket" title="尚未選取" />
      ) : (
        <div className="stack" style={{ gap: '12px' }}>
          {comments.length === 0 ? (
            <EmptyState message="尚無留言，先留第一條。" title="沒有留言" />
          ) : (
            <div className="stack" style={{ gap: '8px' }}>
              {comments.map((comment) => (
                <div key={comment.id} className="card" style={{ padding: '0.75rem', boxShadow: 'none', border: '1px solid #edf0f5' }}>
                  <div className="ticket-comment-meta">
                    <strong>{comment.author}</strong>
                    <span className="text-muted">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p style={{ margin: 0 }}>{comment.content}</p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={onCommentSubmit} className="stack" style={{ gap: '12px' }}>
            <label className="form-field">
              <div className="form-label">新增留言</div>
              <textarea
                className="form-input"
                rows={3}
                value={commentText}
                onChange={(e) => onCommentTextChange(e.target.value)}
                placeholder="新增留言或回覆..."
              />
            </label>
            <div className="toolbar-actions-row">
              <button type="submit" className="btn btn-primary" disabled={commentSubmitting}>
                {commentSubmitting ? 'Sending...' : 'Add Comment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </SectionCard>
  );
}

export default function TicketsPage() {
  const { checkPermission, user } = useCurrentUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TicketFormState>(INITIAL_FORM);
  const [commentText, setCommentText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');

  const selectedTicket = useMemo(() => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null, [tickets, selectedTicketId]);
  const canManageTickets = checkPermission('can_manage_tickets');
  const canViewTickets = checkPermission('can_view_tickets');
  const canReportTickets = checkPermission('can_report_tickets');

  const loadTickets = async (preferTicketId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTickets();
      setTickets(data);
      setSelectedTicketId((current) => {
        if (preferTicketId && data.some((ticket) => ticket.id === preferTicketId)) return preferTicketId;
        if (current && data.some((ticket) => ticket.id === current)) return current;
        return data[0]?.id ?? null;
      });
    } catch (err) {
      setError(normalizeText(err, '無法讀取 tickets'));
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (ticketId: string | null) => {
    if (!ticketId) {
      setComments([]);
      return;
    }
    try {
      const data = await fetchCommentsByTicket(ticketId);
      setComments(data);
    } catch (err) {
      setComments([]);
      setError(normalizeText(err, '無法讀取留言'));
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  useEffect(() => {
    void loadComments(selectedTicketId);
  }, [selectedTicketId, tickets]);

  const handleCreateTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canReportTickets) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isBlank(form.title) || isBlank(form.description)) {
        throw new Error('請填寫標題與描述');
      }
      const createdTicketId = await createTicket({
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        createdBy: user?.email?.trim() || 'unknown@example.com',
        submittedBy: user?.displayName?.trim() || user?.email?.trim() || '匿名',
      });
      setForm(INITIAL_FORM);
      setStatusFilter('all');
      await loadTickets(createdTicketId);
      setSelectedTicketId(createdTicketId);
      setCommentText('');
    } catch (err) {
      setError(normalizeText(err, '建立 ticket 失敗'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    if (!canManageTickets) {
      setError('您沒有權限修改 ticket 狀態');
      return;
    }
    setError(null);
    try {
      await updateTicketStatus(ticketId, status);
      await loadTickets(ticketId);
    } catch (err) {
      setError(normalizeText(err, '更新狀態失敗'));
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!canManageTickets) {
      setError('您沒有權限刪除 ticket');
      return;
    }
    setError(null);
    try {
      await deleteTicket(ticketId);
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
        setComments([]);
      }
      await loadTickets();
    } catch (err) {
      setError(normalizeText(err, '刪除失敗'));
    }
  };

  const handleAddComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canViewTickets || !selectedTicket) return;
    setCommentSubmitting(true);
    setError(null);
    try {
      if (isBlank(commentText)) throw new Error('請輸入留言內容');
      await addComment({
        ticketId: selectedTicket.id,
        content: commentText.trim(),
        author: user?.displayName ?? user?.email ?? '匿名',
        authorEmail: user?.email ?? 'unknown@example.com',
      });
      setCommentText('');
      await loadComments(selectedTicket.id);
    } catch (err) {
      setError(normalizeText(err, '留言失敗'));
    } finally {
      setCommentSubmitting(false);
    }
  };

  const counts = useMemo(() => ({
    all: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'open').length,
    in_progress: tickets.filter((ticket) => ticket.status === 'in_progress').length,
    resolved: tickets.filter((ticket) => ticket.status === 'resolved').length,
  }), [tickets]);

  if (loading) {
    return <div className="page"><Loading>載入中…</Loading></div>;
  }

  if (!canViewTickets) {
    return (
      <div className="page tickets-page">
        <PageHeader title="Tickets" description="問題回報、狀態追蹤、留言" />
        <ErrorState message="您沒有權限查看 tickets" />
      </div>
    );
  }

  return (
    <div className="page tickets-page">
      <PageHeader title="Tickets" description="問題回報、狀態追蹤、留言" />
      {error ? <ErrorState message={error} /> : null}
      <div className="tickets-hero card" style={{ marginBottom: '24px', padding: '18px' }}>
        <div className="stack" style={{ gap: '10px' }}>
          <div className="text-muted">Quick overview</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <Badge text={`全部 ${counts.all}`} variant="info" />
            <Badge text={`待處理 ${counts.open}`} variant="warning" />
            <Badge text={`處理中 ${counts.in_progress}`} variant="info" />
            <Badge text={`已完成 ${counts.resolved}`} variant="success" />
          </div>
        </div>
      </div>

      <div className="tickets-layout" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '24px', alignItems: 'start' }}>
        <TicketComposer value={form} submitting={submitting} onChange={setForm} onSubmit={handleCreateTicket} />
        <TicketList
          tickets={tickets}
          loading={loading}
          selectedTicketId={selectedTicketId}
          statusFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onSelect={(ticketId) => { setSelectedTicketId(ticketId); setComments([]); }}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </div>
      <CommentPanel
        ticket={selectedTicket}
        comments={comments}
        commentText={commentText}
        commentSubmitting={commentSubmitting}
        onCommentTextChange={setCommentText}
        onCommentSubmit={handleAddComment}
      />
    </div>
  );
}
