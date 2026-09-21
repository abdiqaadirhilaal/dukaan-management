import { FormEvent, useState } from 'react';
import { paymentService } from '../services/paymentService';
import type { CustomerWithTotals, PaymentMethod } from '../types';
import { formatMoney } from '../utils/format';
import CustomerPicker from './CustomerPicker';
import Modal from './Modal';
import { ErrorAlert, Spinner } from './ui';

interface Props {
  initialCustomer?: CustomerWithTotals;
  onClose: () => void;
  onSaved: () => void;
}

export default function RecordPaymentModal({ initialCustomer, onClose, onSaved }: Props) {
  const [customer, setCustomer] = useState<CustomerWithTotals | null>(initialCustomer ?? null);
  const [amount, setAmount] = useState(initialCustomer ? String(initialCustomer.totals.outstanding) : '');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outstanding = customer?.totals.outstanding ?? 0;
  const value = Number(amount) || 0;

  function pick(c: CustomerWithTotals | null) {
    setCustomer(c);
    setAmount(c ? String(c.totals.outstanding) : '');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!customer) return setError('Select a customer');
    setBusy(true);
    setError(null);
    try {
      await paymentService.create({ customerId: customer._id, amount: value, method, note: note || undefined });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the payment');
      setBusy(false);
    }
  }

  return (
    <Modal title="Record debt payment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorAlert message={error} />

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Customer *</span>
          {initialCustomer ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">{initialCustomer.fullName}</p>
          ) : (
            <CustomerPicker value={customer} onChange={pick} debtOnly />
          )}
        </div>

        {customer && (
          <p className="text-sm text-slate-600">
            Currently owes <span className="font-semibold text-rose-600">{formatMoney(outstanding)}</span>
            {value > 0 && value <= outstanding && <> · balance after payment <span className="font-semibold">{formatMoney(outstanding - value)}</span></>}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Amount *</span>
            <input className="input" type="number" step="0.01" min="0.01" max={outstanding || undefined} required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Method</span>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile money</option>
              <option value="bank">Bank</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Note</span>
          <input className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy || !customer}>
            {busy && <Spinner className="h-4 w-4" />}
            Record payment
          </button>
        </div>
      </form>
    </Modal>
  );
}
