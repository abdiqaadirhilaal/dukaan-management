import { Banknote, Coins, CreditCard, ReceiptText, ShoppingCart, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCard from '../components/StatCard';
import { Badge, Card, EmptyState, ErrorAlert, Spinner, Tone } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { reportService } from '../services/reportService';
import type { PaymentType } from '../types';
import { formatMoney, toInputDate } from '../utils/format';

const typeTone: Record<PaymentType, Tone> = { cash: 'emerald', credit: 'rose', partial: 'amber' };

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toInputDate(d);
};

export default function ReportsPage() {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(toInputDate(new Date()));

  const { data, error, loading } = useFetch(() => reportService.summary(from, to), [from, to]);

  const presets: { label: string; apply: () => void }[] = [
    { label: 'Today', apply: () => { setFrom(daysAgo(0)); setTo(daysAgo(0)); } },
    { label: 'Last 7 days', apply: () => { setFrom(daysAgo(6)); setTo(daysAgo(0)); } },
    { label: 'Last 30 days', apply: () => { setFrom(daysAgo(29)); setTo(daysAgo(0)); } },
    {
      label: 'This month',
      apply: () => { const d = new Date(); setFrom(toInputDate(new Date(d.getFullYear(), d.getMonth(), 1))); setTo(daysAgo(0)); },
    },
  ];

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-500">From<input type="date" className="input mt-1" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
        <label className="text-xs text-slate-500">To<input type="date" className="input mt-1" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
        {presets.map((p) => <button key={p.label} className="btn-secondary" onClick={p.apply}>{p.label}</button>)}
        {loading && <Spinner className="h-4 w-4 text-emerald-600" />}
      </div>

      <ErrorAlert message={error} />

      {s && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Total sales" value={formatMoney(s.totalSales)} icon={ShoppingCart} tone="emerald" hint={`${s.salesCount} sale(s)`} />
            <StatCard label="Cash received at sale" value={formatMoney(s.cashAtSale)} icon={Banknote} tone="sky" />
            <StatCard label="Credit given" value={formatMoney(s.creditGiven)} icon={CreditCard} tone="amber" />
            <StatCard label="Debt payments received" value={formatMoney(s.paymentsReceived)} icon={Coins} tone="emerald" />
            <StatCard label="Total cash collected" value={formatMoney(s.cashCollected)} icon={ReceiptText} tone="sky" hint="At sale + debt payments" />
            <StatCard label="Gross profit" value={formatMoney(s.profit)} icon={TrendingUp} tone={s.profit >= 0 ? 'emerald' : 'rose'} hint="Sales minus cost price of items sold" />
          </div>

          <Card title="Sales and payments per day">
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} minTickGap={16} />
                  <YAxis tick={{ fontSize: 12 }} width={48} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="payments" name="Debt payments" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Top products">
              {data.topProducts.length === 0 ? <EmptyState text="No sales in this period." /> : (
                <table className="w-full">
                  <thead className="bg-slate-50"><tr><th className="th">Product</th><th className="th text-right">Qty sold</th><th className="th text-right">Revenue</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.topProducts.map((p) => (
                      <tr key={p.productId}><td className="td font-medium text-slate-900">{p.name}</td><td className="td text-right">{p.quantity}</td><td className="td text-right font-medium">{formatMoney(p.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Top debtors (right now)">
              {data.topDebtors.length === 0 ? <EmptyState text="Nobody owes anything." /> : (
                <table className="w-full">
                  <thead className="bg-slate-50"><tr><th className="th">Customer</th><th className="th text-right">Owes</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.topDebtors.map((d) => (
                      <tr key={d._id}>
                        <td className="td"><Link to={`/customers/${d._id}`} className="font-medium text-slate-900 hover:text-emerald-700">{d.fullName}</Link><p className="text-xs text-slate-500">{d.phone}</p></td>
                        <td className="td text-right font-semibold text-rose-600">{formatMoney(d.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          <Card title="Sales by payment type">
            {data.byPaymentType.length === 0 ? <EmptyState text="No sales in this period." /> : (
              <table className="w-full">
                <thead className="bg-slate-50"><tr><th className="th">Type</th><th className="th text-right">Sales</th><th className="th text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.byPaymentType.map((t) => (
                    <tr key={t.type}><td className="td"><Badge tone={typeTone[t.type]}>{t.type}</Badge></td><td className="td text-right">{t.count}</td><td className="td text-right font-medium">{formatMoney(t.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
