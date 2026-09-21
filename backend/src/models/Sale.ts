import { Schema, model } from 'mongoose';

const saleItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0, default: 0 }, // snapshot at time of sale, used for profit reports
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

// amountPaid = money received at the time of sale, amountDue = the part put on credit (debt).
const saleSchema = new Schema(
  {
    receiptNo: { type: String, unique: true, sparse: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    items: { type: [saleItemSchema], validate: (v: unknown[]) => v.length > 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0 },
    amountDue: { type: Number, required: true, min: 0 },
    paymentType: { type: String, enum: ['cash', 'credit', 'partial'], required: true },
    saleDate: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    note: { type: String, trim: true, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    archivedAt: Date,
    archiveReason: String,
  },
  { timestamps: true },
);

saleSchema.index({ customer: 1, status: 1, saleDate: -1 });

saleSchema.pre('validate', function () {
  if (Math.abs(this.amountPaid + this.amountDue - this.total) > 0.005) {
    this.invalidate('amountDue', 'amountPaid + amountDue must equal the sale total');
  }
  if (this.amountDue > 0 && !this.customer) {
    this.invalidate('customer', 'A customer is required for credit sales');
  }
});

export const Sale = model('Sale', saleSchema);
