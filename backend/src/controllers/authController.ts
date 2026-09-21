import { z } from 'zod';
import { User } from '../models/User';
import { logActivity } from '../services/activityService';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { signToken } from '../utils/token';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const login = asyncHandler(async (req, res) => {
  const { username, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ username: username.toLowerCase() }).select('+password');
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid username or password');
  }

  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  res.json({
    token: signToken(user.id, user.role),
    user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role },
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = z
    .object({ currentPassword: z.string().min(1, 'Current password is required'), newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100) })
    .parse(req.body);

  const user = await User.findById(req.user!.id).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  await logActivity({ userId: user.id, action: 'user.change_password', entity: 'User', entityId: user._id, description: `${user.fullName} changed their password` });

  // Fresh token so the current session stays signed in; all older tokens are now rejected.
  res.json({ token: signToken(user.id, user.role) });
});
