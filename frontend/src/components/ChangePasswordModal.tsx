import { FormEvent, useState } from 'react';
import { tokenStore } from '../services/api';
import { authService } from '../services/authService';
import Modal from './Modal';
import { ErrorAlert, Spinner } from './ui';

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setError('The new passwords do not match');
    setBusy(true);
    setError(null);
    try {
      const { token } = await authService.changePassword(current, next);
      tokenStore.set(token); // other devices are signed out, this one stays signed in
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Change password" onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-emerald-700">Your password was changed.</p>
          <div className="flex justify-end"><button className="btn-primary" onClick={onClose}>Close</button></div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <ErrorAlert message={error} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Current password</span>
            <input className="input" type="password" autoComplete="current-password" required autoFocus value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">New password (min 8 characters)</span>
            <input className="input" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Repeat new password</span>
            <input className="input" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Change password</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
