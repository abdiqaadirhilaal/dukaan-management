import { FilterQuery, Types } from 'mongoose';
import { z } from 'zod';
import { ActivityLog } from '../models/ActivityLog';
import { asyncHandler } from '../utils/asyncHandler';
import { dayRange } from '../utils/helpers';
import { dateString, objectId, pageInfo, paging } from '../utils/validators';

const listSchema = z.object({
  entity: z.string().trim().max(30).optional(),
  userId: objectId.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  ...paging(50, 100),
});

export const listActivity = asyncHandler(async (req, res) => {
  const q = listSchema.parse(req.query);
  const filter: FilterQuery<any> = {};
  if (q.entity) filter.entity = q.entity;
  if (q.userId) filter.user = new Types.ObjectId(q.userId);
  if (q.from || q.to) filter.createdAt = dayRange(q.from, q.to);

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('user', 'fullName username')
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({ data: logs, pagination: pageInfo(q.page, q.limit, total) });
});
