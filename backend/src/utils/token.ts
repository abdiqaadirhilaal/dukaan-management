import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../models/User';

export function signToken(userId: string, role: Role): string {
  return jwt.sign({ role }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}
