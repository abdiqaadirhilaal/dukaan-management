import { Types } from 'mongoose';
import { env } from '../config/env';
import { Customer } from '../models/Customer';
import { Payment } from '../models/Payment';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { round2, startOfToday } from '../utils/helpers';
import { getCustomerTotals } from './customerService';

type CustomerRef = { customer: { _id: Types.ObjectId; fullName: string } | null };

const dayKey = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: env.TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export async function getDashboardData() {
  const start = startOfToday();
  const chartStart = new Date(start);
  chartStart.setDate(chartStart.getDate() - 6);

  const lowStockFilter = { isActive: true, $expr: { $lte: ['$stock', '$lowStockThreshold'] } };
  const perDay = (field: string) => ({ $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: env.TIMEZONE } });

  const [
    todaySales,
    todayPayments,
    totals,
    customers,
    products,
    lowStock,
    lowStockProducts,
    recentSales,
    recentDebts,
    recentPayments,
    dailySales,
    dailyPayments,
  ] = await Promise.all([
    Sale.aggregate<{ total: number; cash: number; credit: number; count: number }>([
      { $match: { status: 'active', saleDate: { $gte: start } } },
      { $group: { _id: null, total: { $sum: '$total' }, cash: { $sum: '$amountPaid' }, credit: { $sum: '$amountDue' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate<{ amount: number }>([
      { $match: { status: 'active', paidAt: { $gte: start } } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]),
    getCustomerTotals(),
    Customer.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments(lowStockFilter),
    Product.find(lowStockFilter).sort({ stock: 1 }).limit(8).select('name stock lowStockThreshold unit').lean(),
    Sale.find({ status: 'active' })
      .sort({ saleDate: -1 })
      .limit(8)
      .select('customer total amountPaid amountDue paymentType saleDate')
      .populate<CustomerRef>('customer', 'fullName')
      .lean(),
    Sale.find({ status: 'active', amountDue: { $gt: 0 } })
      .sort({ saleDate: -1 })
      .limit(8)
      .select('customer total amountPaid amountDue paymentType saleDate')
      .populate<CustomerRef>('customer', 'fullName')
      .lean(),
    Payment.find({ status: 'active' })
      .sort({ paidAt: -1 })
      .limit(8)
      .select('customer amount method paidAt')
      .populate<CustomerRef>('customer', 'fullName')
      .lean(),
    Sale.aggregate<{ _id: string; total: number }>([
      { $match: { status: 'active', saleDate: { $gte: chartStart } } },
      { $group: { _id: perDay('saleDate'), total: { $sum: '$total' } } },
    ]),
    Payment.aggregate<{ _id: string; total: number }>([
      { $match: { status: 'active', paidAt: { $gte: chartStart } } },
      { $group: { _id: perDay('paidAt'), total: { $sum: '$amount' } } },
    ]),
  ]);

  const owing = [...totals.values()].filter((t) => t.outstanding > 0);
  const salesByDay = new Map(dailySales.map((d) => [d._id, d.total]));
  const paymentsByDay = new Map(dailyPayments.map((d) => [d._id, d.total]));

  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(chartStart);
    d.setDate(chartStart.getDate() + i);
    const key = dayKey(d);
    return { date: key, sales: round2(salesByDay.get(key) ?? 0), payments: round2(paymentsByDay.get(key) ?? 0) };
  });

  return {
    today: {
      totalSales: round2(todaySales[0]?.total ?? 0),
      cashSales: round2(todaySales[0]?.cash ?? 0),
      creditSales: round2(todaySales[0]?.credit ?? 0),
      paymentsReceived: round2(todayPayments[0]?.amount ?? 0),
      salesCount: todaySales[0]?.count ?? 0,
    },
    debt: {
      totalOutstanding: round2(owing.reduce((sum, t) => sum + t.outstanding, 0)),
      customersWithDebt: owing.length,
    },
    counts: { customers, products, lowStock },
    lowStockProducts,
    recentSales,
    recentDebts,
    recentPayments,
    chart,
  };
}
