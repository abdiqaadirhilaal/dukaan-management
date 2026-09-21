import { Schema, model } from 'mongoose';

// A payment received from a customer against their outstanding debt.
const paymentSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ['cash', 'mobile_money', 'bank', 'other'], default: 'cash' },
    note: { type: String, trim: true, default: '' },
    paidAt: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    archivedAt: Date,
    archiveReason: String,
  },
  { timestamps: true },
);

paymentSchema.index({ customer: 1, status: 1, paidAt: -1 });

export const Payment = model('Payment', paymentSchema);
