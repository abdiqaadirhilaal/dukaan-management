import { HandCoins, Search, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Pagination from '../components/Pagination';
import RecordPaymentModal from '../components/RecordPaymentModal';
import StatCard from '../components/StatCard';
import { Card, EmptyState, ErrorAlert, Spinner } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { useFetch } from '../hooks/useFetch';
import { debtService } from '../services/debtService';
import type { CustomerWithTotals } from '../types';
import { formatDate, formatMoney } from '../utils/format';

export default function DebtsPage() {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<CustomerWithTotals | null>(null);

  const { data, error, loading, reload } = useFetch(() => debtService.list({ search: debounced, page, limit: 20 }), [debounced, page]);
  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Debts</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total outstanding" value={formatMoney(data?.summary.totalOutstanding ?? 0)} icon={Wallet} tone="rose" />
        <StatCard label="Customers who owe" value={data?.summary.customersWithDebt ?? 0} icon={HandCoins} tone="amber" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {loading && <Spinner className="h-4 w-4 text-emerald-600" />}
      </div>

      <ErrorAlert message={error} />

      <Card>
        {rows.length === 0 && !loading ? (
          <EmptyState text={search ? 'No matching customers owe money.' : 'Nobody owes anything right now.'} />
        ) : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="th">Customer</th><th className="th hidden text-right md:table-cell">Credit given</th><th className="th hidden text-right md:table-cell">Paid</th>
                  <th className="th text-right">Owes</th><th className="th hidden lg:table-cell">Last payment</th><th className="th hidden lg:table-cell">Last credit</th><th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c._id}>
                    <td className="td">
                      <Link to={`/customers/${c._id}`} className="font-medium text-slate-900 hover:text-emerald-700">{c.fullName}</Link>
                      <p className="text-xs text-slate-500">{c.phone}</p>
                    </td>
                    <td className="td hidden text-right text-slate-600 md:table-cell">{formatMoney(c.totals.totalCredit)}</td>
                    <td className="td hidden text-right text-slate-600 md:table-cell">{formatMoney(c.totals.totalPaid)}</td>
                    <td className="td text-right font-semibold text-rose-600">{formatMoney(c.totals.outstanding)}</td>
                    <td className="td hidden text-slate-500 lg:table-cell">{c.lastPaymentAt ? formatDate(c.lastPaymentAt) : 'Never'}</td>
                    <td className="td hidden text-slate-500 lg:table-cell">{c.lastCreditAt ? formatDate(c.lastCreditAt) : '—'}</td>
                    <td className="td text-right"><button className="btn-primary px-3 py-1.5" onClick={() => setPaying(c)}>Record payment</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.pagination.page} pages={data.pagination.pages} onChange={setPage} />}
      </Card>

      {paying && <RecordPaymentModal initialCustomer={paying} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); reload(); }} />}
    </div>
  );
}
