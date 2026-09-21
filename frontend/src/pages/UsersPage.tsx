import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import Modal from '../components/Modal';
import { Badge, Card, ErrorAlert, Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { userService } from '../services/userService';
import type { AdminUser, Role } from '../types';
import { formatDateTime } from '../utils/format';

function UserModal({ user, onClose, onSaved }: { user: AdminUser | null; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(user?.role ?? 'cashier');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (user) await userService.update(user._id, { fullName, role });
      else await userService.create({ fullName, username, password, role });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the user');
      setBusy(false);
    }
  }

  return (
    <Modal title={user ? `Edit ${user.username}` : 'Add user'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorAlert message={error} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Full name *</span>
          <input className="input" required autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        {!user && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Username *</span>
              <input className="input" required autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password * (min 8 characters)</span>
              <input className="input" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          </>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="cashier">Cashier</option>
            <option value="admin">Admin / Owner</option>
          </select>
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{user ? 'Save changes' : 'Create user'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await userService.resetPassword(user._id, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Reset password: ${user.username}`} onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-emerald-700">Password reset. {user.fullName} is signed out everywhere and must use the new password.</p>
          <div className="flex justify-end"><button className="btn-primary" onClick={onClose}>Close</button></div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <ErrorAlert message={error} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">New password (min 8 characters)</span>
            <input className="input" type="password" required minLength={8} autoFocus autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Reset password</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useFetch(() => userService.list(), []);
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggle(u: AdminUser) {
    if (!window.confirm(`${u.isActive ? 'Deactivate' : 'Activate'} ${u.fullName}?`)) return;
    setActionError(null);
    try {
      await userService.update(u._id, { isActive: !u.isActive });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not change the status');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
        <button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add user</button>
      </div>

      <ErrorAlert message={error ?? actionError} />

      <Card>
        {loading && !data ? <div className="flex justify-center py-10 text-emerald-600"><Spinner className="h-6 w-6" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr><th className="th">Name</th><th className="th">Username</th><th className="th">Role</th><th className="th">Status</th><th className="th hidden md:table-cell">Last login</th><th className="th" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data ?? []).map((u) => (
                  <tr key={u._id} className={u.isActive ? '' : 'opacity-60'}>
                    <td className="td font-medium text-slate-900">{u.fullName}{u._id === me?.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}</td>
                    <td className="td text-slate-600">{u.username}</td>
                    <td className="td"><Badge tone={u.role === 'admin' ? 'emerald' : 'sky'}>{u.role}</Badge></td>
                    <td className="td"><Badge tone={u.isActive ? 'emerald' : 'slate'}>{u.isActive ? 'active' : 'inactive'}</Badge></td>
                    <td className="td hidden text-slate-500 md:table-cell">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</td>
                    <td className="td whitespace-nowrap text-right">
                      <button className="px-2 text-sm text-emerald-700 hover:underline" onClick={() => setEditing(u)}>Edit</button>
                      <button className="px-2 text-sm text-emerald-700 hover:underline" onClick={() => setResetting(u)}>Reset password</button>
                      {u._id !== me?.id && <button className="px-2 text-sm text-slate-500 hover:underline" onClick={() => toggle(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && <UserModal user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}
