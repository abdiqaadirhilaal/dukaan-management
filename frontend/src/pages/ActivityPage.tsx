import { useState } from 'react';
import Pagination from '../components/Pagination';
import { Badge, Card, EmptyState, ErrorAlert, Spinner, Tone } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { activityService } from '../services/activityService';
import { formatDateTime } from '../utils/format';

const ENTITIES = ['Customer', 'Product', 'Sale', 'Payment', 'User'];
const entityTone: Record<string, Tone> = { Customer: 'sky', Product: 'amber', Sale: 'emerald', Payment: 'emerald', User: 'slate' };

export default function ActivityPage() {
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, error, loading } = useFetch(
    () => activityService.list({ entity: entity || undefined, from, to, page, limit: 50 }),
    [entity, from, to, page],
  );
  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Activity log</h1>

      <div className="flex flex-wrap items-end gap-3">
        <select className="input w-auto" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} aria-label="Type">
          <option value="">All activity</option>
          {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <label className="text-xs text-slate-500">From<input type="date" className="input mt-1" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="text-xs text-slate-500">To<input type="date" className="input mt-1" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
        {loading && <Spinner className="h-4 w-4 text-emerald-600" />}
      </div>

      <ErrorAlert message={error} />

      <Card>
        {rows.length === 0 && !loading ? <EmptyState text="No activity recorded for these filters." /> : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr><th className="th">When</th><th className="th">Who</th><th className="th">Type</th><th className="th">What happened</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((l) => (
                  <tr key={l._id}>
                    <td className="td whitespace-nowrap text-slate-500">{formatDateTime(l.createdAt)}</td>
                    <td className="td whitespace-nowrap">{l.user?.fullName ?? 'Unknown'}</td>
                    <td className="td"><Badge tone={entityTone[l.entity] ?? 'slate'}>{l.entity}</Badge></td>
                    <td className="td text-slate-700">{l.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.pagination.page} pages={data.pagination.pages} onChange={setPage} />}
      </Card>
    </div>
  );
}
