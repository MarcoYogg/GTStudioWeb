import { useMemo, useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Loading from '../components/common/Loading';
import { PERMISSION_KEYS, PERMISSION_LABELS } from '../constants/permissions';
import { DEFAULT_ROLE_PERMISSIONS, ROLE_HIERARCHY } from '../lib/permissions/roles';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { createMember, deleteMember, fetchMembers, updateMember } from '../features/members/members.service';
import type { Member, MemberStatus, RoleId } from '../types';

const ROLE_LABELS: Record<RoleId, string> = {
  guest: 'Guest',
  member: 'Member',
  finance: 'Finance',
  developer: 'Developer',
};

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

const STATUS_VARIANT: Record<MemberStatus, 'success' | 'warning'> = {
  active: 'success',
  inactive: 'warning',
};

type MemberFormState = {
  email: string;
  name: string;
  roleId: RoleId;
  status: MemberStatus;
};

const INITIAL_FORM: MemberFormState = {
  email: '',
  name: '',
  roleId: 'guest',
  status: 'active',
};

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  return fallback;
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function formatDate(value: Date): string {
  return Number.isNaN(value.getTime()) ? '—' : value.toLocaleDateString();
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

function PermissionMatrix() {
  const roles = ROLE_HIERARCHY;
  return (
    <SectionCard title="Permission Matrix" description="成員管理的權限基準，別靠腦補。">
      <div style={{ overflowX: 'auto' }}>
        <table className="receipt-table" style={{ minWidth: '860px' }}>
          <thead>
            <tr>
              <th>Permission</th>
              {roles.map((role) => (
                <th key={role}>{ROLE_LABELS[role]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_KEYS.map((permission) => (
              <tr key={permission}>
                <td>{PERMISSION_LABELS[permission]}</td>
                {roles.map((role) => (
                  <td key={role}>
                    <Badge
                      text={DEFAULT_ROLE_PERMISSIONS[role][permission] ? 'Yes' : 'No'}
                      variant={DEFAULT_ROLE_PERMISSIONS[role][permission] ? 'success' : 'error'}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function MemberComposer({
  value,
  submitting,
  onChange,
  onSubmit,
  onReset,
  mode,
}: {
  value: MemberFormState;
  submitting: boolean;
  onChange: (next: MemberFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  mode: 'create' | 'edit';
}) {
  return (
    <SectionCard title={mode === 'create' ? 'Add Member' : 'Edit Member'} description="先把資料填齊，之後才有得管。">
      <form onSubmit={onSubmit} className="stack" style={{ gap: '12px' }}>
        <label className="form-field">
          <div className="form-label">Email</div>
          <input className="form-input" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} placeholder="name@example.com" />
        </label>
        <label className="form-field">
          <div className="form-label">Name</div>
          <input className="form-input" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Member name" />
        </label>
        <label className="form-field">
          <div className="form-label">Role</div>
          <select className="form-input" value={value.roleId} onChange={(e) => onChange({ ...value, roleId: e.target.value as RoleId })}>
            {Object.keys(ROLE_LABELS).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role as RoleId]}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <div className="form-label">Status</div>
          <select className="form-input" value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value as MemberStatus })}>
            {Object.keys(STATUS_LABELS).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status as MemberStatus]}
              </option>
            ))}
          </select>
        </label>
        <div className="toolbar-actions-row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : mode === 'create' ? 'Create Member' : 'Update Member'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onReset}>
            Reset
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

function MemberList({
  members,
  loading,
  selectedEmail,
  onSelect,
  onEdit,
  onDelete,
}: {
  members: Member[];
  loading: boolean;
  selectedEmail: string | null;
  onSelect: (member: Member) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}) {
  if (loading) return <Loading>載入中…</Loading>;
  if (members.length === 0) return <EmptyState message="目前沒有成員資料" title="沒有成員" />;

  return (
    <SectionCard title="Member List" description="先看清楚現在有誰，再決定要改誰。">
      <div style={{ overflowX: 'auto' }}>
        <table className="receipt-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} style={{ background: selectedEmail === member.email ? 'rgba(59,130,246,0.06)' : undefined }}>
                <td onClick={() => onSelect(member)}>{member.name}</td>
                <td onClick={() => onSelect(member)}>{member.email}</td>
                <td onClick={() => onSelect(member)}>{ROLE_LABELS[member.roleId]}</td>
                <td onClick={() => onSelect(member)}><Badge text={STATUS_LABELS[member.status]} variant={STATUS_VARIANT[member.status]} /></td>
                <td onClick={() => onSelect(member)}>{formatDate(member.updatedAt)}</td>
                <td>
                  <div className="toolbar-actions-row">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(member)}>Edit</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(member)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export default function MembersPage() {
  const { checkPermission } = useCurrentUser();
  const canManageMembers = checkPermission('can_manage_members');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<MemberFormState>(INITIAL_FORM);

  const selectedMember = useMemo(() => members.find((member) => member.email === selectedEmail) ?? null, [members, selectedEmail]);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMembers();
      setMembers(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(normalizeText(err, '無法讀取 members'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setMode('create');
    setSelectedEmail(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isBlank(form.email) || isBlank(form.name)) {
        throw new Error('請填寫 email 與 name');
      }
      if (mode === 'create') {
        await createMember({
          email: form.email.trim(),
          name: form.name.trim(),
          roleId: form.roleId,
          status: form.status,
        });
      } else if (selectedMember) {
        await updateMember(selectedMember.id, {
          name: form.name.trim(),
          roleId: form.roleId,
          status: form.status,
        });
      }
      await loadMembers();
      resetForm();
    } catch (err) {
      setError(normalizeText(err, '儲存 member 失敗'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (member: Member) => {
    setMode('edit');
    setSelectedEmail(member.email);
    setForm({
      email: member.email,
      name: member.name,
      roleId: member.roleId,
      status: member.status,
    });
  };

  const handleDelete = async (member: Member) => {
    setError(null);
    try {
      await deleteMember(member.id);
      if (selectedEmail === member.email) resetForm();
      await loadMembers();
    } catch (err) {
      setError(normalizeText(err, '刪除 member 失敗'));
    }
  };

  useEffect(() => {
    void loadMembers();
  }, []);

  if (!canManageMembers) {
    return (
      <div className="page members-page">
        <PageHeader title="成員管理" description="成員列表、角色權限設定" />
        <ErrorState message="您沒有權限管理成員" />
      </div>
    );
  }

  return (
    <div className="page members-page">
      <PageHeader
        title="成員管理"
        description="成員列表、角色權限設定"
        action={<Badge text={`Selected: ${selectedMember?.name ?? 'None'}`} variant="info" />}
      />

      {error ? <ErrorState message={error} /> : null}

      <div className="stack" style={{ gap: '24px' }}>
        <div className="members-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: '24px', alignItems: 'start' }}>
          <MemberComposer
            value={form}
            submitting={submitting}
            onChange={setForm}
            onSubmit={handleSubmit}
            onReset={resetForm}
            mode={mode}
          />
          <MemberList
            members={members}
            loading={loading}
            selectedEmail={selectedEmail}
            onSelect={(member) => setSelectedEmail(member.email)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
        <PermissionMatrix />
      </div>
    </div>
  );
}
