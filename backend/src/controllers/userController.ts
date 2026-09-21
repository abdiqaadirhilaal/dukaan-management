import { z } from 'zod';
import { ROLES, User } from '../models/User';
import { logActivity } from '../services/activityService';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { objectId } from '../utils/validators';

const password = z.string().min(8, 'Password must be at least 8 characters').max(100);

const createSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(100),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, 'Username: 3-30 letters, numbers, dot, dash or underscore'),
  password,
  role: z.enum(ROLES),
});

const updateSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
});

async function findOrFail(id: string) {
  const user = objectId.safeParse(id).success ? await User.findById(id) : null;
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

export const listUsers = asyncHandler(async (_req, res) => {
  res.json({ data: await User.find().sort({ fullName: 1 }).lean() });
});

export const createUser = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  if (await User.exists({ username: data.username })) throw new ApiError(409, 'That username is already taken');

  const user = await User.create(data);
  await logActivity({ userId: req.user!.id, action: 'user.create', entity: 'User', entityId: user._id, description: `Created ${user.role} account "${user.username}"` });

  res.status(201).json({ user: { _id: user._id, fullName: user.fullName, username: user.username, role: user.role, isActive: user.isActive } });
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const user = await findOrFail(req.params.id);
  const isSelf = user.id === req.user!.id;

  const losesAdmin = (data.role && data.role !== 'admin') || data.isActive === false;
  if (user.role === 'admin' && user.isActive && losesAdmin) {
    if (isSelf) throw new ApiError(400, 'You cannot demote or deactivate your own account');
    if ((await User.countDocuments({ role: 'admin', isActive: true, _id: { $ne: user._id } })) === 0) {
      throw new ApiError(400, 'There must be at least one active admin');
    }
  }

  user.set(data);
  await user.save();

  await logActivity({ userId: req.user!.id, action: 'user.update', entity: 'User', entityId: user._id, description: `Updated account "${user.username}"`, meta: data });

  res.json({ user: { _id: user._id, fullName: user.fullName, username: user.username, role: user.role, isActive: user.isActive } });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = z.object({ password }).parse(req.body);
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');

  user.password = data.password;
  await user.save();

  await logActivity({ userId: req.user!.id, action: 'user.reset_password', entity: 'User', entityId: user._id, description: `Reset the password of "${user.username}"` });

  res.json({ message: 'Password reset' });
});
