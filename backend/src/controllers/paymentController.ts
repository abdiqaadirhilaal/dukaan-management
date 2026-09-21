import { FilterQuery, Types } from 'mongoose';
import { z } from 'zod';
import { Customer } from '../models/Customer';
import { Payment } from '../models/Payment';
import { logActivity } from '../services/activityService';
import { emptyTotals, getCustomerTotals } from '../services/customerService';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { dayRange, round2 } from '../utils/helpers';
import { dateString, objectId, pageInfo, paging } from '../utils/validators';

const createSchema = z.object({
  customerId: objectId,
  amount: z.coerce.number().positive('Amount must be more than 0'),
  method: z.enum(['cash', 'mobile_money', 'bank', 'other']).default('cash'),
  note: z.string().trim().max(300).optional(),
});

const listSchema = z.object({
  customerId: objectId.optional(),
  status: z.enum(['active', 'archived', 'all']).default('active'),
  from: dateString.optional(),
  to: dateString.optional(),
  ...paging(20, 100),
});

export const listPayments = asyncHandler(async (req, res) => {
  const q = listSchema.parse(req.query);
  const filter: FilterQuery<any> = {};

  const status = req.user!.role === 'admin' ? q.status : 'active';
  if (status !== 'all') filter.status = status;
  if (q.customerId) filter.customer = new Types.ObjectId(q.customerId);
  if (q.from || q.to) filter.paidAt = dayRange(q.from, q.to);

  const [payments, total, sums] = await Promise.all([
    Payment.find(filter)
      .sort({ paidAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('customer', 'fullName phone')
      .populate('receivedBy', 'fullName')
      .lean(),
    Payment.countDocuments(filter),
    Payment.aggregate<{ amount: number }>([{ $match: filter }, { $group: { _id: null, amount: { $sum: '$amount' } } }]),
  ]);

  res.json({ data: payments, pagination: pageInfo(q.page, q.limit, total), totals: { count: total, amount: sums[0]?.amount ?? 0 } });
});

export const createPayment = asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);
  const customer = await Customer.findById(input.customerId);
  if (!customer) throw new ApiError(404, 'Customer not found');

  const amount = round2(input.amount);
  const outstanding = (await getCustomerTotals([customer._id])).get(String(customer._id))?.outstanding ?? emptyTotals().outstanding;
  if (amount > outstanding + 0.005) {
    throw new ApiError(400, outstanding > 0 ? `The payment is more than the ${outstanding.toFixed(2)} this customer owes` : 'This customer has no outstanding debt');
  }

  const payment = await Payment.create({ customer: customer._id, amount, method: input.method, note: input.note ?? '', receivedBy: req.user!.id });

  await logActivity({
    userId: req.user!.id,
    action: 'payment.create',
    entity: 'Payment',
    entityId: payment._id,
    description: `Received ${amount.toFixed(2)} from ${customer.fullName}`,
    meta: { customerId: customer.id, method: input.method, balanceAfter: round2(outstanding - amount) },
  });

  res.status(201).json({ payment });
});

// Payments are never deleted or edited: a mistake is archived (with a reason) and re-entered correctly.
export const archivePayment = asyncHandler(async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(3, 'Please give a reason').max(200) }).parse(req.body);
  const payment = objectId.safeParse(req.params.id).success
    ? await Payment.findOneAndUpdate(
        { _id: req.params.id, status: 'active' },
        { status: 'archived', archivedBy: req.user!.id, archivedAt: new Date(), archiveReason: reason },
        { new: true },
      )
    : null;
  if (!payment) throw new ApiError(404, 'Payment not found or already archived');

  await logActivity({
    userId: req.user!.id,
    action: 'payment.archive',
    entity: 'Payment',
    entityId: payment._id,
    description: `Archived payment of ${payment.amount.toFixed(2)}: ${reason}`,
    meta: { customerId: String(payment.customer) },
  });

  res.json({ payment });
});
