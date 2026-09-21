import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';
import Modal from '../components/Modal';
import { Badge, Card, EmptyState, ErrorAlert, Spinner } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { useFetch } from '../hooks/useFetch';
import { customerService } from '../services/customerService';
import type { CustomerInput } from '../types';
import { formatMoney } from '../utils/format';

type Status = 'active' | 'inactive' | 'all';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState<Status>('active');
  const [hasDebt, setHasDebt] = useState(false);
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, error, loading, reload } = useFetch(
    () => customerService.list({ search: debouncedSearch, status, hasDebt: hasDebt || undefined, page, limit: 20 }),
    [debouncedSearch, status, hasDebt, page],
  );

  async function handleCreate(input: CustomerInput) {
    setSaving(true);
    setFormError(null);
    try {
      await customerService.create(input);
      setShowForm(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save customer');
    } finally {
      setSaving(false);
    }
  }

  const customers = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">{pagination ? `${pagination.total} customer(s)` : ' '}</p>
        </div>
        <button className="btn-primary" onClick={() => { setFormError(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Add customer
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or phone"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value as Status); setPage(1); }} aria-label="Status filter">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={hasDebt} onChange={(e) => { setHasDebt(e.target.checked); setPage(1); }} />
          With debt only
        </label>
        {loading && <Spinner className="h-4 w-4 text-emerald-600" />}
      </div>

      <ErrorAlert message={error} />

      <Card>
        {customers.length === 0 && !loading ? (
          <EmptyState text={search || hasDebt ? 'No customers match your filters.' : 'No customers yet. Add your first customer to get started.'} />
        ) : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="th">Customer</th>
                  <th className="th hidden md:table-cell">Address</th>
                  <th className="th hidden text-right sm:table-cell">Purchases</th>
                  <th className="th text-right">Balance owed</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c._id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/customers/${c._id}`)}>
                    <td className="td">
                      <Link to={`/customers/${c._id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-slate-900 hover:text-emerald-700">
                        {c.fullName}
                      </Link>
                      <p className="text-xs text-slate-500">{c.phone}</p>
                    </td>
                    <td className="td hidden max-w-[240px] truncate text-slate-600 md:table-cell">{c.address || '—'}</td>
                    <td className="td hidden text-right text-slate-600 sm:table-cell">{formatMoney(c.totals.totalPurchases)}</td>
                    <td className={`td text-right font-semibold ${c.totals.outstanding > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {formatMoney(c.totals.outstanding)}
                    </td>
                    <td className="td"><Badge tone={c.isActive ? 'emerald' : 'slate'}>{c.isActive ? 'active' : 'inactive'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
            <span>Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button className="btn-secondary px-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              <button className="btn-secondary px-2" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </Card>

      {showForm && (
        <Modal title="Add customer" onClose={() => setShowForm(false)}>
          <CustomerForm submitLabel="Save customer" submitting={saving} error={formError} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  );
}
