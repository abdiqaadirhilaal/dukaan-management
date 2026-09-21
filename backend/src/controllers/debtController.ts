import { Types } from 'mongoose';
import { z } from 'zod';
import { Customer } from '../models/Customer';
import { Payment } from '../models/Payment';
import { Sale } from '../models/Sale';
import { getCustomerTotals } from '../services/customerService';
import { asyncHandler } from '../utils/asyncHandler';
import { escapeRegex, round2 } from '../utils/helpers';
import { pageInfo, paging } from '../utils/validators';

const listSchema = z.object({ search: z.string().trim().max(100).optional(), ...paging(20, 100) });

// Customers who currently owe money, biggest debt first.
export const listDebts = asyncHandler(async (req, res) => {
  const q = listSchema.parse(req.query);
  const totals = await getCustomerTotals();
  const owing = [...totals.entries()].filter(([, t]) => t.outstanding > 0);

  const filter: Record<string, unknown> = { _id: { $in: owing.map(([id]) => new Types.ObjectId(id)) } };
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ fullName: rx }, { phone: rx }];
  }
  const customers = await Customer.find(filter).lean();

  const rows = customers
    .map((c) => ({ ...c, totals: totals.get(String(c._id))! }))
    .sort((a, b) => b.totals.outstanding - a.totals.outstanding);

  const page = rows.slice((q.page - 1) * q.limit, q.page * q.limit);
  const ids = page.map((c) => c._id);

  const [lastPayments, lastCredits] = await Promise.all([
    Payment.aggregate<{ _id: Types.ObjectId; at: Date }>([
      { $match: { status: 'active', customer: { $in: ids } } },
      { $group: { _id: '$customer', at: { $max: '$paidAt' } } },
    ]),
    Sale.aggregate<{ _id: Types.ObjectId; at: Date }>([
      { $match: { status: 'active', amountDue: { $gt: 0 }, customer: { $in: ids } } },
      { $group: { _id: '$customer', at: { $max: '$saleDate' } } },
    ]),
  ]);
  const paidAt = new Map(lastPayments.map((p) => [String(p._id), p.at]));
  const creditAt = new Map(lastCredits.map((s) => [String(s._id), s.at]));

  res.json({
    data: page.map((c) => ({ ...c, lastPaymentAt: paidAt.get(String(c._id)) ?? null, lastCreditAt: creditAt.get(String(c._id)) ?? null })),
    pagination: pageInfo(q.page, q.limit, rows.length),
    summary: {
      totalOutstanding: round2(owing.reduce((sum, [, t]) => sum + t.outstanding, 0)),
      customersWithDebt: owing.length,
    },
  });
});
