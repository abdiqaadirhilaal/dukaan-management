import { FormEvent, useState } from 'react';
import type { Product, ProductInput } from '../types';
import { ErrorAlert, Spinner } from './ui';

interface Props {
  initial?: Product;
  categories: string[];
  submitting: boolean;
  error: string | null;
  onSubmit: (values: ProductInput) => void;
  onCancel: () => void;
}

const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

export default function ProductForm({ initial, categories, submitting, error, onSubmit, onCancel }: Props) {
  const [f, setF] = useState({
    name: initial?.name ?? '',
    sku: initial?.sku ?? '',
    category: initial?.category ?? '',
    unit: initial?.unit ?? 'pcs',
    costPrice: initial?.costPrice !== undefined ? String(initial.costPrice) : '',
    sellPrice: initial ? String(initial.sellPrice) : '',
    stock: '0',
    lowStockThreshold: String(initial?.lowStockThreshold ?? 5),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      name: f.name,
      sku: f.sku,
      category: f.category,
      unit: f.unit,
      costPrice: num(f.costPrice),
      sellPrice: Number(f.sellPrice),
      lowStockThreshold: num(f.lowStockThreshold),
      ...(initial ? {} : { stock: num(f.stock) }),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorAlert message={error} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Product name *</span>
        <input className="input" required maxLength={150} autoFocus value={f.name} onChange={set('name')} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">SKU / barcode</span>
          <input className="input" maxLength={60} value={f.sku} onChange={set('sku')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Category</span>
          <input className="input" list="product-categories" maxLength={60} value={f.category} onChange={set('category')} />
          <datalist id="product-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Cost price</span>
          <input className="input" type="number" step="0.01" min="0" value={f.costPrice} onChange={set('costPrice')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Selling price *</span>
          <input className="input" type="number" step="0.01" min="0" required value={f.sellPrice} onChange={set('sellPrice')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Unit</span>
          <input className="input" maxLength={20} required value={f.unit} onChange={set('unit')} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {!initial && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Opening stock</span>
            <input className="input" type="number" step="any" value={f.stock} onChange={set('stock')} />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Low-stock alert at</span>
          <input className="input" type="number" step="any" min="0" value={f.lowStockThreshold} onChange={set('lowStockThreshold')} />
        </label>
      </div>
      {initial && <p className="text-xs text-slate-500">To change the stock quantity use “Adjust stock” so the change is recorded.</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner className="h-4 w-4" />}
          {initial ? 'Save changes' : 'Add product'}
        </button>
      </div>
    </form>
  );
}
