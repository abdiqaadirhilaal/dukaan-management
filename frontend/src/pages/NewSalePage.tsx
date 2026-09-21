import { Minus, Plus, Printer, Search, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import CustomerForm from '../components/CustomerForm';
import CustomerPicker from '../components/CustomerPicker';
import Modal from '../components/Modal';
import SaleReceipt from '../components/SaleReceipt';
import { Badge, Card, EmptyState, ErrorAlert, Spinner } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { useFetch } from '../hooks/useFetch';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { saleService } from '../services/saleService';
import type { CustomerInput, CustomerWithTotals, PaymentType, Product, SaleRecord } from '../types';
import { formatMoney } from '../utils/format';

interface CartLine {
  product: Product;
  quantity: string;
  unitPrice: string;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function NewSalePage() {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 250);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerWithTotals | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SaleRecord | null>(null);

  const [newCustomer, setNewCustomer] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const { data: found, loading: searching, reload: reloadProducts } = useFetch(
    () => productService.list({ search: debounced, status: 'active', limit: 12 }),
    [debounced],
  );

  const total = round2(cart.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0));
  const paid = paymentType === 'cash' ? total : paymentType === 'credit' ? 0 : Number(amountPaid) || 0;
  const due = round2(total - paid);

  function add(product: Product) {
    setCart((c) => {
      const existing = c.find((l) => l.product._id === product._id);
      if (existing) return c.map((l) => (l === existing ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l));
      return [...c, { product, quantity: '1', unitPrice: String(product.sellPrice) }];
    });
  }
  const update = (id: string, patch: Partial<CartLine>) => setCart((c) => c.map((l) => (l.product._id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) => setCart((c) => c.filter((l) => l.product._id !== id));

  function reset() {
    setCart([]);
    setCustomer(null);
    setPaymentType('cash');
    setAmountPaid('');
    setNote('');
    setError(null);
    setReceipt(null);
    reloadProducts(); // stock levels changed
  }

  async function submit() {
    setError(null);
    if (cart.length === 0) return setError('Add at least one product');
    if (cart.some((l) => !(Number(l.quantity) > 0) || Number(l.unitPrice) < 0 || l.unitPrice === '')) return setError('Check the quantity and price of every item');
    if (paymentType !== 'cash' && !customer) return setError('Select a customer for credit or partial sales');
    if (paymentType === 'partial' && !(paid > 0 && paid < total)) return setError('The amount paid must be more than 0 and less than the total');

    setBusy(true);
    try {
      const sale = await saleService.create({
        customerId: customer?._id,
        items: cart.map((l) => ({ productId: l.product._id, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
        paymentType,
        amountPaid: paymentType === 'partial' ? paid : undefined,
        note: note || undefined,
      });
      setReceipt(sale);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete the sale');
    } finally {
      setBusy(false);
    }
  }

  async function createCustomer(input: CustomerInput) {
    setSavingCustomer(true);
    setCustomerError(null);
    try {
      const { customer: created } = await customerService.create(input);
      setCustomer({ ...created, totals: { totalPurchases: 0, totalCredit: 0, totalPaid: 0, outstanding: 0 } });
      setNewCustomer(false);
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : 'Could not save customer');
    } finally {
      setSavingCustomer(false);
    }
  }

  const products = found?.data ?? [];
  const types: { key: PaymentType; label: string }[] = [
    { key: 'cash', label: 'Cash' },
    { key: 'credit', label: 'Credit' },
    { key: 'partial', label: 'Part-paid' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">New sale</h1>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Products">
            <div className="space-y-3 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" placeholder="Search products by name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
                {searching && <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />}
              </div>
              {products.length === 0 && !searching ? (
                <p className="py-4 text-center text-sm text-slate-500">No products found.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((p) => (
                    <button key={p._id} type="button" onClick={() => add(p)} className="rounded-lg border border-slate-200 p-3 text-left transition hover:border-emerald-500 hover:bg-emerald-50">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">{formatMoney(p.sellPrice)}</span>
                        <Badge tone={p.stock <= 0 ? 'rose' : p.stock <= p.lowStockThreshold ? 'amber' : 'slate'}>{p.stock} {p.unit}</Badge>
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card title={`Cart (${cart.length})`}>
            {cart.length === 0 ? (
              <EmptyState text="Tap a product to add it to the sale." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr><th className="th">Item</th><th className="th">Qty</th><th className="th">Price</th><th className="th text-right">Total</th><th className="th" /></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((l) => (
                      <tr key={l.product._id}>
                        <td className="td font-medium text-slate-900">{l.product.name}<span className="block text-xs font-normal text-slate-400">{l.product.unit}</span></td>
                        <td className="td">
                          <div className="flex items-center gap-1">
                            <button type="button" className="rounded border border-slate-200 p-1 hover:bg-slate-50" onClick={() => update(l.product._id, { quantity: String(Math.max(0, (Number(l.quantity) || 0) - 1)) })} aria-label="Decrease"><Minus className="h-3 w-3" /></button>
                            <input className="input w-20 px-2 py-1 text-center" type="number" step="any" min="0" value={l.quantity} onChange={(e) => update(l.product._id, { quantity: e.target.value })} />
                            <button type="button" className="rounded border border-slate-200 p-1 hover:bg-slate-50" onClick={() => update(l.product._id, { quantity: String((Number(l.quantity) || 0) + 1) })} aria-label="Increase"><Plus className="h-3 w-3" /></button>
                          </div>
                        </td>
                        <td className="td"><input className="input w-24 px-2 py-1" type="number" step="0.01" min="0" value={l.unitPrice} onChange={(e) => update(l.product._id, { unitPrice: e.target.value })} /></td>
                        <td className="td text-right font-medium">{formatMoney(round2((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0)))}</td>
                        <td className="td"><button type="button" onClick={() => remove(l.product._id)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Customer">
            <div className="space-y-3 p-4">
              <CustomerPicker value={customer} onChange={setCustomer} />
              {!customer && (
                <button type="button" className="btn-secondary w-full" onClick={() => { setCustomerError(null); setNewCustomer(true); }}>
                  <UserPlus className="h-4 w-4" /> Register new customer
                </button>
              )}
              <p className="text-xs text-slate-500">Optional for cash sales. Required for credit.</p>
            </div>
          </Card>

          <Card title="Payment">
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment type">
                {types.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="radio"
                    aria-checked={paymentType === t.key}
                    onClick={() => setPaymentType(t.key)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${paymentType === t.key ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {paymentType === 'partial' && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Amount paid now</span>
                  <input className="input" type="number" step="0.01" min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Note</span>
                <input className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>

              <dl className="space-y-1 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between text-lg font-semibold text-slate-900"><dt>Total</dt><dd>{formatMoney(total)}</dd></div>
                <div className="flex justify-between text-slate-600"><dt>Paid now</dt><dd>{formatMoney(paid)}</dd></div>
                <div className={`flex justify-between font-semibold ${due > 0 ? 'text-rose-600' : 'text-slate-400'}`}><dt>On credit</dt><dd>{formatMoney(due)}</dd></div>
              </dl>

              <ErrorAlert message={error} />
              <button className="btn-primary w-full py-3 text-base" onClick={submit} disabled={busy || cart.length === 0}>
                {busy && <Spinner className="h-4 w-4" />}
                Complete sale
              </button>
            </div>
          </Card>
        </div>
      </div>

      {receipt && (
        <Modal title="Sale completed" onClose={reset}>
          <SaleReceipt sale={receipt} />
          <div className="no-print mt-6 flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</button>
            <button className="btn-primary" onClick={reset}>New sale</button>
          </div>
        </Modal>
      )}

      {newCustomer && (
        <Modal title="Register customer" onClose={() => setNewCustomer(false)}>
          <CustomerForm submitLabel="Save customer" submitting={savingCustomer} error={customerError} onSubmit={createCustomer} onCancel={() => setNewCustomer(false)} />
        </Modal>
      )}
    </div>
  );
}
