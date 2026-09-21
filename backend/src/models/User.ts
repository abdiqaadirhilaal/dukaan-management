import bcrypt from 'bcryptjs';
import { Model, Schema, model } from 'mongoose';

export const ROLES = ['admin', 'cashier'] as const;
export type Role = (typeof ROLES)[number];

export interface IUser {
  fullName: string;
  username: string;
  password: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, object, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'cashier' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    passwordChangedAt: Date, // tokens issued before this moment are rejected
  },
  { timestamps: true },
);

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordChangedAt = new Date();
  }
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser, UserModel>('User', userSchema);
