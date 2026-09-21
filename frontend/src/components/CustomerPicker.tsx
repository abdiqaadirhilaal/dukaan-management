import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useFetch } from '../hooks/useFetch';
import { customerService } from '../services/customerService';
import type { CustomerWithTotals } from '../types';
import { formatMoney } from '../utils/format';

interface Props {
  value: CustomerWithTotals | null;
  onChange: (customer: CustomerWithTotals | null) => void;
  debtOnly?: boolean; // only customers who owe money (used when recording payments)
}

export default function CustomerPicker({ value, onChange, debtOnly = false }: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const search = useDebounce(text, 250);

  const { data } = useFetch(
    () => customerService.list({ search, status: debtOnly ? 'all' : 'active', hasDebt: debtOnly || undefined, limit: 8 }),
    [search, debtOnly],
  );

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{value.fullName}</p>
          <p className="text-xs text-slate-500">
            {value.phone}
            {value.totals.outstanding > 0 && <span className="ml-2 font-medium text-rose-600">owes {formatMoney(value.totals.outstanding)}</span>}
          </p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Clear customer">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const results = data?.data ?? [];
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="input pl-9"
        placeholder={debtOnly ? 'Search customers who owe…' : 'Search customer by name or phone…'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">No customers found</li>}
          {results.map((c) => (
            <li key={c._id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
                onMouseDown={() => { onChange(c); setText(''); }}
              >
                <span>
                  <span className="block text-sm font-medium text-slate-900">{c.fullName}</span>
                  <span className="block text-xs text-slate-500">{c.phone}</span>
                </span>
                {c.totals.outstanding > 0 && <span className="text-xs font-medium text-rose-600">{formatMoney(c.totals.outstanding)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
