import { InferSchemaType, Schema, model } from 'mongoose';

const customerSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    address: { type: String, trim: true, default: '', maxlength: 250 },
    notes: { type: String, trim: true, default: '', maxlength: 1000 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

customerSchema.index({ fullName: 1 });
customerSchema.index({ phone: 1 });

export type ICustomer = InferSchemaType<typeof customerSchema>;
export const Customer = model('Customer', customerSchema);
