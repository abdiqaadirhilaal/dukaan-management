import { Types } from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env';
import { Customer } from '../models/Customer';
import { Payment } from '../models/Payment';
import { Sale } from '../models/Sale';
import { getCustomerTotals } from '../services/customerService';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { dayKey, dayRange, round2 } from '../utils/helpers';
import { dateString } from '../utils/validators';

const querySchema = z.object({ from: dateString, to: dateString });
const MAX_DAYS = 366;

export const getSummary = asyncHandler(async (req, res) => {
  const { from, to } = querySchema.parse(req.query);
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (end < start) throw new ApiError(400, 'The end date is before the start date');
  if ((end.getTime() - start.getTime()) / 86_400_000 > MAX_DAYS) throw new ApiError(400, `Choose a range of at most ${MAX_DAYS} days`);

  const saleMatch = { status: 'active', saleDate: dayRange(from, to) };
  const payMatch = { status: 'active', paidAt: dayRange(from, to) };
  const perDay = (field: string) => ({ $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: env.TIMEZONE } });

  const [sales, lines, payments, daily, dailyPay, topProducts, byType, totals] = await Promise.all([
    Sale.aggregate<{ count: number; total: number; paid: number; due: number }>([
      { $match: saleMatch },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' }, paid: { $sum: '$amountPaid' }, due: { $sum: '$amountDue' } } },
    ]),
    Sale.aggregate<{ revenue: number; cost: number }>([
      { $match: saleMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$items.total' },
          cost: { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$items.costPrice', 0] }] } },
        },
      },
    ]),
    Payment.aggregate<{ count: number; amount: number }>([
      { $match: payMatch },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    Sale.aggregate<{ _id: string; total: number }>([{ $match: saleMatch }, { $group: { _id: perDay('saleDate'), total: { $sum: '$total' } } }]),
    Payment.aggregate<{ _id: string; total: number }>([{ $match: payMatch }, { $group: { _id: perDay('paidAt'), total: { $sum: '$amount' } } }]),
    Sale.aggregate<{ _id: Types.ObjectId; name: string; quantity: number; revenue: number }>([
      { $match: saleMatch },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
    Sale.aggregate<{ _id: string; count: number; total: number }>([
      { $match: saleMatch },
      { $group: { _id: '$paymentType', count: { $sum: 1 }, total: { $sum: '$total' } } },
    ]),
    getCustomerTotals(),
  ]);

  const salesByDay = new Map(daily.map((d) => [d._id, d.total]));
  const paymentsByDay = new Map(dailyPay.map((d) => [d._id, d.total]));
  const chart: { date: string; sales: number; payments: number }[] = [];
  for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const key = dayKey(cur);
    chart.push({ date: key, sales: round2(salesByDay.get(key) ?? 0), payments: round2(paymentsByDay.get(key) ?? 0) });
  }

  // Debtors are "as of now", not limited to the selected dates.
  const topOwing = [...totals.entries()]
    .filter(([, t]) => t.outstanding > 0)
    .sort((a, b) => b[1].outstanding - a[1].outstanding)
    .slice(0, 10);
  const debtorDocs = await Customer.find({ _id: { $in: topOwing.map(([id]) => new Types.ObjectId(id)) } }).select('fullName phone').lean();
  const debtorById = new Map(debtorDocs.map((c) => [String(c._id), c]));

  const revenue = lines[0]?.revenue ?? 0;
  const cost = lines[0]?.cost ?? 0;
  const cashAtSale = sales[0]?.paid ?? 0;
  const paymentsReceived = payments[0]?.amount ?? 0;

  res.json({
    range: { from, to },
    summary: {
      salesCount: sales[0]?.count ?? 0,
      totalSales: round2(sales[0]?.total ?? 0),
      cashAtSale: round2(cashAtSale),
      creditGiven: round2(sales[0]?.due ?? 0),
      paymentsReceived: round2(paymentsReceived),
      cashCollected: round2(cashAtSale + paymentsReceived),
      revenue: round2(revenue),
      cost: round2(cost),
      profit: round2(revenue - cost),
    },
    byPaymentType: byType.map((t) => ({ type: t._id, count: t.count, total: round2(t.total) })),
    chart,
    topProducts: topProducts.map((p) => ({ productId: String(p._id), name: p.name, quantity: p.quantity, revenue: round2(p.revenue) })),
    topDebtors: topOwing.map(([id, t]) => ({
      _id: id,
      fullName: debtorById.get(id)?.fullName ?? 'Unknown',
      phone: debtorById.get(id)?.phone ?? '',
      outstanding: t.outstanding,
    })),
  });
});
