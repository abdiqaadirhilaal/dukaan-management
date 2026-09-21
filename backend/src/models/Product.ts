import { Schema, model } from 'mongoose';

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    sku: { type: String, trim: true, unique: true, sparse: true },
    category: { type: String, trim: true, default: '' },
    unit: { type: String, trim: true, default: 'pcs' },
    costPrice: { type: Number, min: 0, default: 0 },
    sellPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

productSchema.index({ name: 1 });

export const Product = model('Product', productSchema);
