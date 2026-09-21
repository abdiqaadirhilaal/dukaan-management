import { Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog';

interface LogParams {
  userId: string;
  action: string;
  entity: string;
  entityId?: Types.ObjectId | string;
  description: string;
  meta?: Record<string, unknown>;
}

// Never let a logging failure break the actual operation.
export async function logActivity(p: LogParams): Promise<void> {
  try {
    await ActivityLog.create({
      user: p.userId,
      action: p.action,
      entity: p.entity,
      entityId: p.entityId,
      description: p.description,
      meta: p.meta,
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}
