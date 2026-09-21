import { ChangeEvent, FormEvent, useState } from 'react';
import type { Customer, CustomerInput } from '../types';
import { ErrorAlert, Spinner } from './ui';

interface Props {
  initial?: Customer;
  submitLabel: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (values: CustomerInput) => void;
  onCancel: () => void;
}

export default function CustomerForm({ initial, submitLabel, submitting, error, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<Required<CustomerInput>>({
    fullName: initial?.fullName ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    notes: initial?.notes ?? '',
  });

  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorAlert message={error} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Full name *</span>
        <input className="input" required maxLength={120} autoFocus {...bind('fullName')} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Phone number *</span>
        <input className="input" type="tel" required maxLength={30} {...bind('phone')} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Address</span>
        <input className="input" maxLength={250} {...bind('address')} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
        <textarea className="input min-h-[80px]" maxLength={1000} {...bind('notes')} />
      </label>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner className="h-4 w-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
