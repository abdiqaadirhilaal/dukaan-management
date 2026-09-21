import { FilterQuery, Types } from 'mongoose';
import { z } from 'zod';
import { AuthUser } from '../middleware/auth';
import { Sale } from '../models/Sale';
import { logActivity } from '../services/activityService';
import { archiveSale, createSale as createSaleRecord } from '../services/saleService';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { dayRange, escapeRegex } from '../utils/helpers';
import { dateString, objectId, pageInfo, paging } from '../utils/validators';

const createSchema = z.object({
  customerId: objectId.optional(),
  items: z
    .array(
      z.object({
        productId: objectId,
        quantity: z.coerce.number().positive('Quantity must be more than 0').max(100000),
        unitPrice: z.coerce.number().min(0).optional(),
      }),
    )
    .min(1, 'Add at least one product')
    .max(100),
  paymentType: z.enum(['cash', 'credit', 'partial']),
  amountPaid: z.coerce.number().min(0).optional(),
  note: z.string().trim().max(500).optional(),
});

const listSchema = z.object({
  search: z.string().trim().max(50).optional(),
  customerId: objectId.optional(),
  paymentType: z.enum(['cash', 'credit', 'partial']).optional(),
  status: z.enum(['active', 'archived', 'all']).default('active'),
  from: dateString.optional(),
  to: dateString.optional(),
  ...paging(20, 100),
});

const populateSale = <T extends { populate: (path: string, select: string) => T }>(query: T) =>
  query.populate('customer', 'fullName phone').populate('createdBy', 'fullName');

// Cashiers only ever see the active sales they rang up themselves.
function ownsSale(sale: { createdBy?: unknown }, user: AuthUser) {
  const creator = sale.createdBy as { _id?: unknown } | null | undefined;
  return String(creator?._id ?? creator) === user.id;
}

export const listSales = asyncHandler(async (req, res) => {
  const q = listSchema.parse(req.query);
  const user = req.user!;
  const filter: FilterQuery<any> = {};

  const status = user.role === 'admin' ? q.status : 'active';
  if (status !== 'all') filter.status = status;
  if (user.role === 'cashier') filter.createdBy = new Types.ObjectId(user.id);
  if (q.customerId) filter.customer = new Types.ObjectId(q.customerId);
  if (q.paymentType) filter.paymentType = q.paymentType;
  if (q.search) filter.receiptNo = new RegExp(escapeRegex(q.search), 'i');
  if (q.from || q.to) filter.saleDate = dayRange(q.from, q.to);

  const [sales, total, sums] = await Promise.all([
    populateSale(Sale.find(filter).sort({ saleDate: -1 }).skip((q.page - 1) * q.limit).limit(q.limit)).lean(),
    Sale.countDocuments(filter),
    Sale.aggregate<{ total: number; paid: number; due: number }>([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$amountPaid' }, due: { $sum: '$amountDue' } } },
    ]),
  ]);

  res.json({
    data: sales,
    pagination: pageInfo(q.page, q.limit, total),
    totals: { count: total, total: sums[0]?.total ?? 0, paid: sums[0]?.paid ?? 0, due: sums[0]?.due ?? 0 },
  });
});

async function loadSale(id: string, user: AuthUser) {
  const sale = objectId.safeParse(id).success ? await populateSale(Sale.findById(id)).lean() : null;
  if (!sale || (user.role === 'cashier' && (sale.status !== 'active' || !ownsSale(sale, user)))) {
    throw new ApiError(404, 'Sale not found');
  }
  return sale;
}

export const getSale = asyncHandler(async (req, res) => {
  res.json({ sale: await loadSale(req.params.id, req.user!) });
});

export const createSale = asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);
  const created = await createSaleRecord(input, req.user!.id);

  await logActivity({
    userId: req.user!.id,
    action: 'sale.create',
    entity: 'Sale',
    entityId: created._id,
    description: `Sale ${created.receiptNo}: total ${created.total} (${created.paymentType})${created.amountDue > 0 ? `, on credit ${created.amountDue}` : ''}`,
    meta: { total: created.total, amountDue: created.amountDue, customer: input.customerId },
  });

  res.status(201).json({ sale: await loadSale(String(created._id), req.user!) });
});

export const archiveSaleHandler = asyncHandler(async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(3, 'Please give a reason').max(200) }).parse(req.body);
  const sale = await archiveSale(req.params.id, req.user!.id, reason);

  await logActivity({
    userId: req.user!.id,
    action: 'sale.archive',
    entity: 'Sale',
    entityId: sale._id,
    description: `Archived sale ${sale.receiptNo} (total ${sale.total}): ${reason}`,
    meta: { total: sale.total, amountDue: sale.amountDue },
  });

  res.json({ sale });
});
