import { AlertTriangle, Banknote, Coins, CreditCard, Package, RefreshCw, ShoppingCart, UserX, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCard from '../components/StatCard';
import { Badge, Card, EmptyState, ErrorAlert, Spinner, Tone } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { dashboardService } from '../services/dashboardService';
import type { CustomerRef, PaymentType, RecentSale } from '../types';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

const typeTone: Record<PaymentType, Tone> = { cash: 'emerald', credit: 'rose', partial: 'amber' };

function CustomerLink({ customer }: { customer: CustomerRef | null }) {
  if (!customer) return <span className="text-slate-400">Walk-in</span>;
  return (
    <Link to={`/customers/${customer._id}`} className="font-medium text-slate-800 hover:text-emerald-700">
      {customer.fullName}
    </Link>
  );
}

function SalesTable({ rows, showDue }: { rows: RecentSale[]; showDue?: boolean }) {
  if (rows.length === 0) return <EmptyState text="Nothing to show yet." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="th">Date</th>
            <th className="th">Customer</th>
            <th className="th">Type</th>
            <th className="th text-right">{showDue ? 'Debt' : 'Total'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((s) => (
            <tr key={s._id}>
              <td className="td whitespace-nowrap text-slate-500">{formatDateTime(s.saleDate)}</td>
              <td className="td"><CustomerLink customer={s.customer} /></td>
              <td className="td"><Badge tone={typeTone[s.paymentType]}>{s.paymentType}</Badge></td>
              <td className="td text-right font-medium">{formatMoney(showDue ? s.amountDue : s.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useFetch(() => dashboardService.get(), []);

  if (!data) {
    return error ? <ErrorAlert message={error} /> : <div className="flex justify-center py-24 text-emerald-600"><Spinner className="h-8 w-8" /></div>;
  }

  const { today, debt, counts } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Today, {formatDate(new Date().toISOString())}</p>
        </div>
        <button className="btn-secondary" onClick={reload} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <ErrorAlert message={error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Today's total sales" value={formatMoney(today.totalSales)} icon={ShoppingCart} tone="emerald" hint={`${today.salesCount} sale(s)`} />
        <StatCard label="Today's cash sales" value={formatMoney(today.cashSales)} icon={Banknote} tone="sky" />
        <StatCard label="Today's credit sales" value={formatMoney(today.creditSales)} icon={CreditCard} tone="amber" />
        <StatCard label="Total outstanding debt" value={formatMoney(debt.totalOutstanding)} icon={Wallet} tone="rose" />
        <StatCard label="Payments received today" value={formatMoney(today.paymentsReceived)} icon={Coins} tone="emerald" />
        <StatCard label="Customers" value={counts.customers} icon={Users} tone="slate" />
        <StatCard label="Customers with debt" value={debt.customersWithDebt} icon={UserX} tone="rose" />
        <StatCard label="Products" value={counts.products} icon={Package} tone="sky" />
        <StatCard label="Low-stock products" value={counts.lowStock} icon={AlertTriangle} tone={counts.lowStock > 0 ? 'amber' : 'slate'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Last 7 days" className="lg:col-span-2">
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={48} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payments" name="Debt payments" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Low stock">
          {data.lowStockProducts.length === 0 ? (
            <EmptyState text="All products are well stocked." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.lowStockProducts.map((p) => (
                <li key={p._id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="font-medium text-slate-800">{p.name}</span>
                  <Badge tone={p.stock <= 0 ? 'rose' : 'amber'}>{p.stock} {p.unit} left</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Recent sales">
        <SalesTable rows={data.recentSales} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Recent debt transactions">
          <SalesTable rows={data.recentDebts} showDue />
        </Card>

        <Card title="Recent payments">
          {data.recentPayments.length === 0 ? (
            <EmptyState text="No payments recorded yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Customer</th>
                    <th className="th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentPayments.map((p) => (
                    <tr key={p._id}>
                      <td className="td whitespace-nowrap text-slate-500">{formatDateTime(p.paidAt)}</td>
                      <td className="td"><CustomerLink customer={p.customer} /></td>
                      <td className="td text-right font-medium text-emerald-700">{formatMoney(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
