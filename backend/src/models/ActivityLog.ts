import { Schema, model } from 'mongoose';

const activityLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true }, // e.g. "customer.create"
    entity: { type: String, required: true }, // e.g. "Customer"
    entityId: { type: Schema.Types.ObjectId },
    description: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ createdAt: -1 });

export const ActivityLog = model('ActivityLog', activityLogSchema);
