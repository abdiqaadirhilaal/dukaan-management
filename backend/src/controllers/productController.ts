import { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env';
import { Product } from '../models/Product';
import { logActivity } from '../services/activityService';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { escapeRegex } from '../utils/helpers';
import { objectId, pageInfo, paging } from '../utils/validators';

const productBody = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(150),
  sku: z.string().trim().max(60).optional().transform((v) => v || undefined),
  category: z.string().trim().max(60).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  costPrice: z.coerce.number().min(0).optional(),
  sellPrice: z.coerce.number().min(0, 'Selling price is required'),
  stock: z.coerce.number().optional(),
  lowStockThreshold: z.coerce.number().min(0).optional(),
});

const listSchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  lowStock: z.enum(['true', 'false']).optional(),
  ...paging(50, 200),
});

// Cashiers can see products but not what the shop paid for them.
function forRole<T extends { costPrice?: number }>(product: T, role: string) {
  if (role === 'admin') return product;
  const { costPrice: _hidden, ...rest } = product;
  return rest;
}

async function findOrFail(id: string) {
  const product = objectId.safeParse(id).success ? await Product.findById(id) : null;
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
}

export const listProducts = asyncHandler(async (req, res) => {
  const q = listSchema.parse(req.query);
  const filter: FilterQuery<any> = {};

  if (q.status !== 'all') filter.isActive = q.status === 'active';
  if (q.category) filter.category = q.category;
  if (q.lowStock === 'true') filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { sku: rx }];
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ name: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({ data: products.map((p) => forRole(p, req.user!.role)), pagination: pageInfo(q.page, q.limit, total) });
});

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = (await Product.distinct('category', { category: { $ne: '' } })) as string[];
  res.json({ categories: categories.sort((a, b) => a.localeCompare(b)) });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await findOrFail(req.params.id);
  res.json({ product: forRole(product.toObject(), req.user!.role) });
});

export const createProduct = asyncHandler(async (req, res) => {
  const data = productBody.parse(req.body);
  const product = await Product.create({ ...data, createdBy: req.user!.id });

  await logActivity({
    userId: req.user!.id,
    action: 'product.create',
    entity: 'Product',
    entityId: product._id,
    description: `Added product ${product.name}`,
    meta: { sellPrice: product.sellPrice, stock: product.stock },
  });

  res.status(201).json({ product });
});

// Stock is changed only through sales or the adjust-stock endpoint, so every change is traceable.
export const updateProduct = asyncHandler(async (req, res) => {
  const data = productBody.omit({ stock: true }).partial().parse(req.body);
  const product = await findOrFail(req.params.id);

  product.set(data);
  await product.save();

  await logActivity({
    userId: req.user!.id,
    action: 'product.update',
    entity: 'Product',
    entityId: product._id,
    description: `Updated product ${product.name}`,
    meta: { fields: Object.keys(data) },
  });

  res.json({ product });
});

export const setProductStatus = asyncHandler(async (req, res) => {
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  const product = await findOrFail(req.params.id);

  product.isActive = isActive;
  await product.save();

  await logActivity({
    userId: req.user!.id,
    action: isActive ? 'product.activate' : 'product.deactivate',
    entity: 'Product',
    entityId: product._id,
    description: `${isActive ? 'Activated' : 'Deactivated'} product ${product.name}`,
  });

  res.json({ product });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const { change, reason } = z
    .object({
      change: z.coerce.number().refine((v) => v !== 0, 'The change cannot be zero'),
      reason: z.string().trim().min(3, 'Please give a reason').max(200),
    })
    .parse(req.body);
  const product = await findOrFail(req.params.id);

  if (!env.ALLOW_NEGATIVE_STOCK && product.stock + change < 0) {
    throw new ApiError(400, `Stock cannot go below zero (current stock: ${product.stock})`);
  }

  const updated = await Product.findByIdAndUpdate(product._id, { $inc: { stock: change } }, { new: true });

  await logActivity({
    userId: req.user!.id,
    action: 'product.stock_adjust',
    entity: 'Product',
    entityId: product._id,
    description: `Stock of ${product.name} ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}: ${reason}`,
    meta: { before: product.stock, change, after: updated?.stock },
  });

  res.json({ product: updated });
});
