import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import ProductForm from '../components/ProductForm';
import { Badge, Card, EmptyState, ErrorAlert, Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';
import { useFetch } from '../hooks/useFetch';
import { productService } from '../services/productService';
import type { Product, ProductInput } from '../types';
import { formatMoney } from '../utils/format';

function AdjustStockModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [change, setChange] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await productService.adjustStock(product._id, Number(change), reason);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not adjust the stock');
      setBusy(false);
    }
  }

  const after = product.stock + (Number(change) || 0);
  return (
    <Modal title={`Adjust stock: ${product.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorAlert message={error} />
        <p className="text-sm text-slate-600">Current stock: <span className="font-semibold">{product.stock} {product.unit}</span></p>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Change (use − to remove stock)</span>
          <input className="input" type="number" step="any" required autoFocus value={change} onChange={(e) => setChange(e.target.value)} placeholder="e.g. 24 or -3" />
        </label>
        {change !== '' && <p className="text-sm text-slate-600">New stock: <span className="font-semibold">{after} {product.unit}</span></p>}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Reason *</span>
          <input className="input" required minLength={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="New delivery, damaged, stock count…" />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy || Number(change) === 0}>{busy && <Spinner className="h-4 w-4" />}Save</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const categories = useFetch(() => productService.categories(), []);
  const { data, error, loading, reload } = useFetch(
    () => productService.list({ search: debounced, category: category || undefined, status: isAdmin ? status : 'active', lowStock: lowStock || undefined, page, limit: 30 }),
    [debounced, category, status, lowStock, page],
  );

  async function save(input: ProductInput) {
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') await productService.create(input);
      else if (editing) await productService.update(editing._id, input);
      setEditing(null);
      reload();
      categories.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the product');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: Product) {
    if (!window.confirm(`${p.isActive ? 'Deactivate' : 'Activate'} ${p.name}?`)) return;
    setActionError(null);
    try {
      await productService.setStatus(p._id, !p.isActive);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not change the status');
    }
  }

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">{data ? `${data.pagination.total} product(s)` : ' '}</p>
        </div>
        {isAdmin && <button className="btn-primary" onClick={() => { setFormError(null); setEditing('new'); }}><Plus className="h-4 w-4" /> Add product</button>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input className="input w-64" placeholder="Search name or SKU" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="input w-auto" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Category">
          <option value="">All categories</option>
          {(categories.data ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {isAdmin && (
          <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} aria-label="Status">
            <option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All</option>
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }} />
          Low stock only
        </label>
        {loading && <Spinner className="h-4 w-4 text-emerald-600" />}
      </div>

      <ErrorAlert message={error ?? actionError} />

      <Card>
        {rows.length === 0 && !loading ? (
          <EmptyState text={isAdmin ? 'No products yet. Add your first product to start selling.' : 'No products found.'} />
        ) : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="th">Product</th><th className="th hidden md:table-cell">Category</th>
                  {isAdmin && <th className="th hidden text-right sm:table-cell">Cost</th>}
                  <th className="th text-right">Price</th><th className="th text-right">Stock</th>{isAdmin && <><th className="th">Status</th><th className="th" /></>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <tr key={p._id} className={p.isActive ? '' : 'opacity-60'}>
                    <td className="td"><span className="font-medium text-slate-900">{p.name}</span>{p.sku && <span className="block text-xs text-slate-500">{p.sku}</span>}</td>
                    <td className="td hidden text-slate-600 md:table-cell">{p.category || '—'}</td>
                    {isAdmin && <td className="td hidden text-right text-slate-600 sm:table-cell">{formatMoney(p.costPrice ?? 0)}</td>}
                    <td className="td text-right font-medium">{formatMoney(p.sellPrice)}</td>
                    <td className="td text-right"><Badge tone={p.stock <= 0 ? 'rose' : p.stock <= p.lowStockThreshold ? 'amber' : 'emerald'}>{p.stock} {p.unit}</Badge></td>
                    {isAdmin && (
                      <>
                        <td className="td"><Badge tone={p.isActive ? 'emerald' : 'slate'}>{p.isActive ? 'active' : 'inactive'}</Badge></td>
                        <td className="td whitespace-nowrap text-right">
                          <button className="px-2 text-sm text-emerald-700 hover:underline" onClick={() => setAdjusting(p)}>Stock</button>
                          <button className="px-2 text-sm text-emerald-700 hover:underline" onClick={() => { setFormError(null); setEditing(p); }}>Edit</button>
                          <button className="px-2 text-sm text-slate-500 hover:underline" onClick={() => toggle(p)}>{p.isActive ? 'Deactivate' : 'Activate'}</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.pagination.page} pages={data.pagination.pages} onChange={setPage} />}
      </Card>

      {editing && (
        <Modal title={editing === 'new' ? 'Add product' : 'Edit product'} onClose={() => setEditing(null)}>
          <ProductForm initial={editing === 'new' ? undefined : editing} categories={categories.data ?? []} submitting={saving} error={formError} onSubmit={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {adjusting && <AdjustStockModal product={adjusting} onClose={() => setAdjusting(null)} onSaved={() => { setAdjusting(null); reload(); }} />}
    </div>
  );
}
