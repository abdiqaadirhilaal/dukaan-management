import { Types } from 'mongoose';
import { Payment } from '../models/Payment';
import { Sale } from '../models/Sale';
import { round2 } from '../utils/helpers';

export interface CustomerTotals {
  totalPurchases: number;
  totalCredit: number;
  totalPaid: number;
  outstanding: number;
}

export const emptyTotals = (): CustomerTotals => ({ totalPurchases: 0, totalCredit: 0, totalPaid: 0, outstanding: 0 });

/**
 * Balances are always computed from the sales and payments collections (never stored),
 * so they can't drift out of sync. Archived records are ignored.
 * outstanding = credit given on sales - payments received.
 */
export async function getCustomerTotals(ids?: Types.ObjectId[]): Promise<Map<string, CustomerTotals>> {
  const customerMatch = ids ? { $in: ids } : { $ne: null };

  const [sales, payments] = await Promise.all([
    Sale.aggregate<{ _id: Types.ObjectId; purchases: number; credit: number }>([
      { $match: { status: 'active', customer: customerMatch } },
      { $group: { _id: '$customer', purchases: { $sum: '$total' }, credit: { $sum: '$amountDue' } } },
    ]),
    Payment.aggregate<{ _id: Types.ObjectId; paid: number }>([
      { $match: { status: 'active', customer: customerMatch } },
      { $group: { _id: '$customer', paid: { $sum: '$amount' } } },
    ]),
  ]);

  const map = new Map<string, CustomerTotals>();
  const entry = (id: Types.ObjectId): CustomerTotals => {
    const key = String(id);
    if (!map.has(key)) map.set(key, emptyTotals());
    return map.get(key)!;
  };

  sales.forEach((s) => {
    const t = entry(s._id);
    t.totalPurchases = s.purchases;
    t.totalCredit = s.credit;
  });
  payments.forEach((p) => {
    entry(p._id).totalPaid = p.paid;
  });
  map.forEach((t) => {
    t.totalPurchases = round2(t.totalPurchases);
    t.totalCredit = round2(t.totalCredit);
    t.totalPaid = round2(t.totalPaid);
    t.outstanding = round2(t.totalCredit - t.totalPaid);
  });

  return map;
}

export async function getCustomerProfile(customerId: Types.ObjectId) {
  const [totalsMap, sales, payments] = await Promise.all([
    getCustomerTotals([customerId]),
    Sale.find({ customer: customerId, status: 'active' }).sort({ saleDate: -1 }).lean(),
    Payment.find({ customer: customerId, status: 'active' }).sort({ paidAt: -1 }).lean(),
  ]);

  // Statement: every sale and payment in date order with the running balance after each entry.
  const events = [
    ...sales.map((s) => ({
      id: String(s._id),
      type: 'sale' as const,
      date: s.saleDate,
      description: s.items.map((i) => `${i.name} ×${i.quantity}`).join(', '),
      amount: s.total,
      debtChange: s.amountDue,
    })),
    ...payments.map((p) => ({
      id: String(p._id),
      type: 'payment' as const,
      date: p.paidAt,
      description: p.note || `Payment (${p.method.replace('_', ' ')})`,
      amount: p.amount,
      debtChange: -p.amount,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = 0;
  const ledger = events
    .map((e) => {
      balance = round2(balance + e.debtChange);
      return { ...e, balance };
    })
    .reverse();

  return { totals: totalsMap.get(String(customerId)) ?? emptyTotals(), sales, payments, ledger };
}
