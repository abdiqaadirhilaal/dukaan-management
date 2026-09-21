import { Plus, Printer } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import ReasonModal from '../components/ReasonModal';
import SaleReceipt from '../components/SaleReceipt';
import { Badge, Card, EmptyState, ErrorAlert, Spinner, Tone } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';
import { useFetch } from '../hooks/useFetch';
import { saleService } from '../services/saleService';
import type { PaymentType, SaleRecord } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';

const typeTone: Record<PaymentType, Tone> = { cash: 'emerald', credit: 'rose', partial: 'amber' };

export default function SalesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paymentType, setPaymentType] = useState<'' | PaymentType>('');
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SaleRecord | null>(null);
  const [archiving, setArchiving] = useState(false);

  const { data, error, loading, reload } = useFetch(
    () => saleService.list({ search: debounced, from, to, paymentType: paymentType || undefined, status: isAdmin ? status : undefined, page, limit: 20 }),
    [debounced, from, to, paymentType, status, page],
  );

  const rows = data?.data ?? [];
  const totals = data?.totals;
  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sales</h1>
          {!isAdmin && <p className="text-sm text-slate-500">Your own sales</p>}
        </div>
        <Link to="/sales/new" className="btn-primary"><Plus className="h-4 w-4" /> New sale</Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <input className="input w-48" placeholder="Receipt no…" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
        <label className="text-xs text-slate-500">From<input type="date" className="input mt-1" value={from} onChange={(e) => reset(setFrom)(e.target.value)} /></label>
        <label className="text-xs text-slate-500">To<input type="date" className="input mt-1" value={to} onChange={(e) => reset(setTo)(e.target.value)} /></label>
        <select className="input w-auto" value={paymentType} onChange={(e) => reset(setPaymentType)(e.target.value as '' | PaymentType)} aria-label="Payment type">
          <option value="">All types</option>
          <option value="cash">Cash</option>
          <option value="credit">Credit</option>
          <option value="partial">Part-paid</option>
        </select>
        {isAdmin && (
          <select className="input w-auto" value={status} onChange={(e) => reset(setStatus)(e.target.value as typeof status)} aria-label="Status">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        )}
        {loading && <Spinner className="h-4 w-4 text-emerald-600" />}
      </div>

      <ErrorAlert message={error} />

      {totals && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[['Sales', String(totals.count)], ['Total', formatMoney(totals.total)], ['Paid at sale', formatMoney(totals.paid)], ['On credit', formatMoney(totals.due)]].map(([label, value]) => (
            <div key={label} className="card px-5 py-3"><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-semibold text-slate-900">{value}</p></div>
          ))}
        </div>
      )}

      <Card>
        {rows.length === 0 && !loading ? (
          <EmptyState text="No sales match these filters." />
        ) : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="th">Receipt</th><th className="th">Date</th><th className="th">Customer</th><th className="th">Type</th>
                  <th className="th text-right">Total</th><th className="th text-right">On credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((s) => (
                  <tr key={s._id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(s)}>
                    <td className="td font-medium text-slate-900">{s.receiptNo ?? '—'} {s.status === 'archived' && <Badge tone="rose">archived</Badge>}</td>
                    <td className="td whitespace-nowrap text-slate-500">{formatDateTime(s.saleDate)}</td>
                    <td className="td">{s.customer?.fullName ?? <span className="text-slate-400">Walk-in</span>}</td>
                    <td className="td"><Badge tone={typeTone[s.paymentType]}>{s.paymentType}</Badge></td>
                    <td className="td text-right font-medium">{formatMoney(s.total)}</td>
                    <td className={`td text-right ${s.amountDue > 0 ? 'font-semibold text-rose-600' : 'text-slate-400'}`}>{formatMoney(s.amountDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.pagination.page} pages={data.pagination.pages} onChange={setPage} />}
      </Card>

      {selected && (
        <Modal title="Sale details" onClose={() => setSelected(null)}>
          <SaleReceipt sale={selected} />
          <div className="no-print mt-6 flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</button>
            {isAdmin && selected.status === 'active' && (
              <button className="btn-secondary text-rose-600" onClick={() => setArchiving(true)}>Archive sale</button>
            )}
          </div>
        </Modal>
      )}

      {archiving && selected && (
        <ReasonModal
          title="Archive sale"
          description="The sale is removed from all totals and the customer's debt, and its stock is returned. The record stays for the audit trail."
          confirmLabel="Archive sale"
          onClose={() => setArchiving(false)}
          onConfirm={async (reason) => {
            await saleService.archive(selected._id, reason);
            setArchiving(false);
            setSelected(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
