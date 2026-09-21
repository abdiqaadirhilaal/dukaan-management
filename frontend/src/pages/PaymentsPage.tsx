import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Pagination from '../components/Pagination';
import ReasonModal from '../components/ReasonModal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import { Badge, Card, EmptyState, ErrorAlert, Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { paymentService } from '../services/paymentService';
import type { PaymentRecord } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';

export default function PaymentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [recording, setRecording] = useState(false);
  const [archiving, setArchiving] = useState<PaymentRecord | null>(null);

  const { data, error, loading, reload } = useFetch(
    () => paymentService.list({ from, to, status: isAdmin ? status : undefined, page, limit: 20 }),
    [from, to, status, page],
  );
  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
          {data && <p className="text-sm text-slate-500">{data.totals.count} payment(s) · {formatMoney(data.totals.amount)}</p>}
        </div>
        <button className="btn-primary" onClick={() => setRecording(true)}><Plus className="h-4 w-4" /> Record payment</button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-500">From<input type="date" className="input mt-1" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="text-xs text-slate-500">To<input type="date" className="input mt-1" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
        {isAdmin && (
          <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} aria-label="Status">
            <option value="active">Active</option><option value="archived">Archived</option><option value="all">All</option>
          </select>
        )}
        {loading && <Spinner className="h-4 w-4 text-emerald-600" />}
      </div>

      <ErrorAlert message={error} />

      <Card>
        {rows.length === 0 && !loading ? (
          <EmptyState text="No payments match these filters." />
        ) : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="th">Date</th><th className="th">Customer</th><th className="th hidden sm:table-cell">Method</th><th className="th hidden md:table-cell">Note</th>
                  <th className="th hidden lg:table-cell">Received by</th><th className="th text-right">Amount</th>{isAdmin && <th className="th" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <tr key={p._id} className={p.status === 'archived' ? 'bg-rose-50/40 text-slate-400' : ''}>
                    <td className="td whitespace-nowrap">{formatDateTime(p.paidAt)}</td>
                    <td className="td">
                      {p.customer ? <Link to={`/customers/${p.customer._id}`} className="font-medium text-slate-900 hover:text-emerald-700">{p.customer.fullName}</Link> : '—'}
                      {p.status === 'archived' && <span className="ml-2"><Badge tone="rose">archived</Badge></span>}
                      {p.archiveReason && <p className="text-xs">{p.archiveReason}</p>}
                    </td>
                    <td className="td hidden capitalize sm:table-cell">{p.method.replace('_', ' ')}</td>
                    <td className="td hidden max-w-[220px] truncate md:table-cell">{p.note || '—'}</td>
                    <td className="td hidden lg:table-cell">{p.receivedBy?.fullName ?? '—'}</td>
                    <td className={`td text-right font-semibold ${p.status === 'archived' ? 'line-through' : 'text-emerald-700'}`}>{formatMoney(p.amount)}</td>
                    {isAdmin && <td className="td text-right">{p.status === 'active' && <button className="text-sm text-rose-600 hover:underline" onClick={() => setArchiving(p)}>Archive</button>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.pagination.page} pages={data.pagination.pages} onChange={setPage} />}
      </Card>

      {recording && <RecordPaymentModal onClose={() => setRecording(false)} onSaved={() => { setRecording(false); reload(); }} />}
      {archiving && (
        <ReasonModal
          title="Archive payment"
          description={`The ${formatMoney(archiving.amount)} payment from ${archiving.customer?.fullName ?? 'this customer'} will be removed from their balance. The record stays for the audit trail.`}
          confirmLabel="Archive payment"
          onClose={() => setArchiving(null)}
          onConfirm={async (reason) => {
            await paymentService.archive(archiving._id, reason);
            setArchiving(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
