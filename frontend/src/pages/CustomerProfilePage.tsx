import { ArrowLeft, CreditCard, HandCoins, MapPin, Pencil, Phone, ShoppingBag, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';
import Modal from '../components/Modal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import StatCard from '../components/StatCard';
import { Badge, Card, EmptyState, ErrorAlert, Spinner, Tone } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { customerService } from '../services/customerService';
import type { CustomerInput, PaymentType } from '../types';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

type Tab = 'ledger' | 'debts' | 'payments';
const typeTone: Record<PaymentType, Tone> = { cash: 'emerald', credit: 'rose', partial: 'amber' };

export default function CustomerProfilePage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { data, error, reload } = useFetch(() => customerService.get(id), [id]);

  const [tab, setTab] = useState<Tab>('ledger');
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="space-y-4">
        <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Customers</Link>
        {error ? <ErrorAlert message={error} /> : <div className="flex justify-center py-24 text-emerald-600"><Spinner className="h-8 w-8" /></div>}
      </div>
    );
  }

  const { customer, totals, sales, payments, ledger } = data;
  const debts = sales.filter((s) => s.amountDue > 0);

  async function handleUpdate(input: CustomerInput) {
    setSaving(true);
    setFormError(null);
    try {
      await customerService.update(id, input);
      setEditing(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not update customer');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    const next = !customer.isActive;
    const warning = next ? '' : totals.outstanding > 0 ? ` They still owe ${formatMoney(totals.outstanding)}; the debt stays on record.` : '';
    if (!window.confirm(`${next ? 'Activate' : 'Deactivate'} ${customer.fullName}?${warning}`)) return;
    setActionError(null);
    try {
      await customerService.setStatus(id, next);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not change status');
    }
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'ledger', label: 'All transactions', count: ledger.length },
    { key: 'debts', label: 'Debt history', count: debts.length },
    { key: 'payments', label: 'Payment history', count: payments.length },
  ];

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Customers</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{customer.fullName}</h1>
            <Badge tone={customer.isActive ? 'emerald' : 'slate'}>{customer.isActive ? 'active' : 'inactive'}</Badge>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><Phone className="h-4 w-4" /> {customer.phone}</p>
        </div>
        <div className="flex gap-2">
          {totals.outstanding > 0 && <button className="btn-primary" onClick={() => setPaying(true)}><HandCoins className="h-4 w-4" /> Record payment</button>}
          <button className="btn-secondary" onClick={() => { setFormError(null); setEditing(true); }}><Pencil className="h-4 w-4" /> Edit</button>
          {user?.role === 'admin' && (
            <button className="btn-secondary" onClick={toggleStatus}>{customer.isActive ? 'Deactivate' : 'Activate'}</button>
          )}
        </div>
      </div>

      <ErrorAlert message={actionError} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total purchases" value={formatMoney(totals.totalPurchases)} icon={ShoppingBag} tone="sky" />
        <StatCard label="Total credit / debt" value={formatMoney(totals.totalCredit)} icon={CreditCard} tone="amber" />
        <StatCard label="Total paid" value={formatMoney(totals.totalPaid)} icon={HandCoins} tone="emerald" />
        <StatCard
          label={totals.outstanding < 0 ? 'Credit balance' : 'Outstanding balance'}
          value={formatMoney(Math.abs(totals.outstanding))}
          icon={Wallet}
          tone={totals.outstanding > 0 ? 'rose' : 'slate'}
        />
      </div>

      <Card title="Customer information">
        <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Address</dt><dd className="mt-0.5 flex items-center gap-1 text-slate-800"><MapPin className="h-4 w-4 text-slate-400" />{customer.address || '—'}</dd></div>
          <div><dt className="text-slate-500">Notes</dt><dd className="mt-0.5 whitespace-pre-wrap text-slate-800">{customer.notes || '—'}</dd></div>
          <div><dt className="text-slate-500">Created</dt><dd className="mt-0.5 text-slate-800">{formatDate(customer.createdAt)}</dd></div>
          <div><dt className="text-slate-500">Last updated</dt><dd className="mt-0.5 text-slate-800">{formatDate(customer.updatedAt)}</dd></div>
        </dl>
      </Card>

      <Card>
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium ${tab === t.key ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t.label} <span className="ml-1 text-xs text-slate-400">({t.count})</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {tab === 'ledger' && (ledger.length === 0 ? <EmptyState text="No transactions yet." /> : (
            <table className="w-full">
              <thead className="bg-slate-50"><tr>
                <th className="th">Date</th><th className="th">Type</th><th className="th">Details</th>
                <th className="th text-right">Amount</th><th className="th text-right">Debt change</th><th className="th text-right">Balance after</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((e) => (
                  <tr key={`${e.type}-${e.id}`}>
                    <td className="td whitespace-nowrap text-slate-500">{formatDateTime(e.date)}</td>
                    <td className="td"><Badge tone={e.type === 'sale' ? 'sky' : 'emerald'}>{e.type}</Badge></td>
                    <td className="td max-w-[280px] truncate text-slate-700">{e.description}</td>
                    <td className="td text-right">{formatMoney(e.amount)}</td>
                    <td className={`td text-right font-medium ${e.debtChange > 0 ? 'text-rose-600' : e.debtChange < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {e.debtChange > 0 ? '+' : ''}{formatMoney(e.debtChange)}
                    </td>
                    <td className="td text-right font-semibold">{formatMoney(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

          {tab === 'debts' && (debts.length === 0 ? <EmptyState text="This customer has never bought on credit." /> : (
            <table className="w-full">
              <thead className="bg-slate-50"><tr>
                <th className="th">Date</th><th className="th">Items</th><th className="th">Type</th>
                <th className="th text-right">Sale total</th><th className="th text-right">Paid at sale</th><th className="th text-right">Debt added</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {debts.map((s) => (
                  <tr key={s._id}>
                    <td className="td whitespace-nowrap text-slate-500">{formatDateTime(s.saleDate)}</td>
                    <td className="td max-w-[280px] truncate text-slate-700">{s.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</td>
                    <td className="td"><Badge tone={typeTone[s.paymentType]}>{s.paymentType}</Badge></td>
                    <td className="td text-right">{formatMoney(s.total)}</td>
                    <td className="td text-right">{formatMoney(s.amountPaid)}</td>
                    <td className="td text-right font-semibold text-rose-600">{formatMoney(s.amountDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

          {tab === 'payments' && (payments.length === 0 ? <EmptyState text="No payments recorded yet." /> : (
            <table className="w-full">
              <thead className="bg-slate-50"><tr>
                <th className="th">Date</th><th className="th">Method</th><th className="th">Note</th><th className="th text-right">Amount</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td className="td whitespace-nowrap text-slate-500">{formatDateTime(p.paidAt)}</td>
                    <td className="td capitalize">{p.method.replace('_', ' ')}</td>
                    <td className="td text-slate-600">{p.note || '—'}</td>
                    <td className="td text-right font-semibold text-emerald-700">{formatMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </Card>

      {paying && <RecordPaymentModal initialCustomer={{ ...customer, totals }} onClose={() => setPaying(false)} onSaved={() => { setPaying(false); reload(); }} />}

      {editing && (
        <Modal title="Edit customer" onClose={() => setEditing(false)}>
          <CustomerForm initial={customer} submitLabel="Save changes" submitting={saving} error={formError} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  );
}
