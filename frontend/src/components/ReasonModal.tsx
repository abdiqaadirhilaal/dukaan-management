import { FormEvent, useState } from 'react';
import Modal from './Modal';
import { ErrorAlert, Spinner } from './ui';

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

// Used for actions that must leave an explanation behind (archiving sales and payments).
export default function ReasonModal({ title, description, confirmLabel, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">{description}</p>
        <ErrorAlert message={error} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Reason *</span>
          <textarea className="input min-h-[80px]" required minLength={3} maxLength={200} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary bg-rose-600 hover:bg-rose-700" disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
