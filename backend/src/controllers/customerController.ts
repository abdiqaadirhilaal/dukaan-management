import { FilterQuery, Types } from 'mongoose';
import { z } from 'zod';
import { Customer, ICustomer } from '../models/Customer';
import { logActivity } from '../services/activityService';
import { emptyTotals, getCustomerProfile, getCustomerTotals } from '../services/customerService';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { escapeRegex } from '../utils/helpers';

const bodySchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(120),
  phone: z.string().trim().min(5, 'Phone number is required').max(30),
  address: z.string().trim().max(250).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const listSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  hasDebt: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

async function findOrFail(id: string) {
  const customer = Types.ObjectId.isValid(id) ? await Customer.findById(id) : null;
  if (!customer) throw new ApiError(404, 'Customer not found');
  return customer;
}

export const listCustomers = asyncHandler(async (req, res) => {
  const q = listSchema.parse(req.query);
  const filter: FilterQuery<ICustomer> = {};

  if (q.status !== 'all') filter.isActive = q.status === 'active';

  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ fullName: rx }, { phone: rx }];
  }

  if (q.hasDebt === 'true') {
    const all = await getCustomerTotals();
    filter._id = {
      $in: [...all.entries()].filter(([, t]) => t.outstanding > 0).map(([id]) => new Types.ObjectId(id)),
    };
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .sort({ fullName: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Customer.countDocuments(filter),
  ]);

  const totals = await getCustomerTotals(customers.map((c) => c._id));

  res.json({
    data: customers.map((c) => ({ ...c, totals: totals.get(String(c._id)) ?? emptyTotals() })),
    pagination: { page: q.page, limit: q.limit, total, pages: Math.max(1, Math.ceil(total / q.limit)) },
  });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await findOrFail(req.params.id);
  const profile = await getCustomerProfile(customer._id);
  res.json({ customer, ...profile });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const data = bodySchema.parse(req.body);
  const customer = await Customer.create({ ...data, createdBy: req.user!.id, updatedBy: req.user!.id });

  await logActivity({
    userId: req.user!.id,
    action: 'customer.create',
    entity: 'Customer',
    entityId: customer._id,
    description: `Registered customer ${customer.fullName} (${customer.phone})`,
  });

  res.status(201).json({ customer });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const data = bodySchema.partial().parse(req.body);
  const customer = await findOrFail(req.params.id);

  customer.set({ ...data, updatedBy: req.user!.id });
  await customer.save();

  await logActivity({
    userId: req.user!.id,
    action: 'customer.update',
    entity: 'Customer',
    entityId: customer._id,
    description: `Updated customer ${customer.fullName}`,
    meta: { fields: Object.keys(data) },
  });

  res.json({ customer });
});

// Customers are never deleted: their debt and payment history must stay intact. Admins can deactivate instead.
export const setCustomerStatus = asyncHandler(async (req, res) => {
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  const customer = await findOrFail(req.params.id);

  customer.isActive = isActive;
  customer.updatedBy = new Types.ObjectId(req.user!.id);
  await customer.save();

  await logActivity({
    userId: req.user!.id,
    action: isActive ? 'customer.activate' : 'customer.deactivate',
    entity: 'Customer',
    entityId: customer._id,
    description: `${isActive ? 'Activated' : 'Deactivated'} customer ${customer.fullName}`,
  });

  res.json({ customer });
});
