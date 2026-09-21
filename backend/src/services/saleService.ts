import { Customer } from '../models/Customer';
import { nextSequence } from '../models/Counter';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { round2 } from '../utils/helpers';

export interface SaleInput {
  customerId?: string;
  items: { productId: string; quantity: number; unitPrice?: number }[];
  paymentType: 'cash' | 'credit' | 'partial';
  amountPaid?: number;
  note?: string;
}

/**
 * Creates a sale and takes the stock. Works on a standalone MongoDB (no transactions):
 * each product is decremented with an atomic conditional update, and everything already
 * taken is put back if a later step fails.
 */
export async function createSale(input: SaleInput, userId: string) {
  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = input.items.map((item) => {
    const p = byId.get(item.productId);
    if (!p) throw new ApiError(400, 'One of the products no longer exists or is inactive');
    const unitPrice = round2(item.unitPrice ?? p.sellPrice);
    return {
      product: p._id,
      name: p.name,
      quantity: item.quantity,
      unitPrice,
      costPrice: p.costPrice ?? 0,
      total: round2(item.quantity * unitPrice),
    };
  });

  const total = round2(lines.reduce((sum, l) => sum + l.total, 0));
  if (total <= 0) throw new ApiError(400, 'The sale total must be greater than zero');

  let amountPaid: number;
  if (input.paymentType === 'cash') {
    amountPaid = total;
  } else if (input.paymentType === 'credit') {
    amountPaid = 0;
  } else {
    amountPaid = round2(input.amountPaid ?? 0);
    if (amountPaid <= 0 || amountPaid >= total) {
      throw new ApiError(400, 'For a partial payment the amount paid must be more than 0 and less than the total');
    }
  }
  const amountDue = round2(total - amountPaid);

  if (amountDue > 0) {
    if (!input.customerId) throw new ApiError(400, 'Select a customer for credit or partial sales');
    const customer = await Customer.findById(input.customerId).select('isActive');
    if (!customer) throw new ApiError(400, 'Customer not found');
    if (!customer.isActive) throw new ApiError(400, 'This customer is inactive. Reactivate them before selling on credit.');
  } else if (input.customerId && !(await Customer.exists({ _id: input.customerId }))) {
    throw new ApiError(400, 'Customer not found');
  }

  const taken: { id: unknown; quantity: number }[] = [];
  try {
    for (const line of lines) {
      const filter = env.ALLOW_NEGATIVE_STOCK ? { _id: line.product } : { _id: line.product, stock: { $gte: line.quantity } };
      const result = await Product.updateOne(filter, { $inc: { stock: -line.quantity } });
      if (result.modifiedCount !== 1) throw new ApiError(409, `Not enough stock for "${line.name}"`);
      taken.push({ id: line.product, quantity: line.quantity });
    }

    const receiptNo = `S-${String(await nextSequence('sale')).padStart(6, '0')}`;
    return await Sale.create({
      receiptNo,
      customer: input.customerId || null,
      items: lines,
      total,
      amountPaid,
      amountDue,
      paymentType: input.paymentType,
      note: input.note ?? '',
      createdBy: userId,
    });
  } catch (err) {
    await Promise.all(taken.map((t) => Product.updateOne({ _id: t.id }, { $inc: { stock: t.quantity } })));
    throw err;
  }
}

/** Archiving keeps the record for the audit trail, removes it from all totals and puts the stock back. */
export async function archiveSale(id: string, userId: string, reason: string) {
  // The status flip is atomic, so stock can never be restored twice.
  const sale = await Sale.findOneAndUpdate(
    { _id: id, status: 'active' },
    { status: 'archived', archivedBy: userId, archivedAt: new Date(), archiveReason: reason },
    { new: true },
  );
  if (!sale) throw new ApiError(404, 'Sale not found or already archived');

  await Promise.all(sale.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } })));
  return sale;
}
