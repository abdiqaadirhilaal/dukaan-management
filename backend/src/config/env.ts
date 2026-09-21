import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 5000),
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '12h',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  TIMEZONE: process.env.TIMEZONE ?? 'Africa/Mogadishu',
  ALLOW_NEGATIVE_STOCK: process.env.ALLOW_NEGATIVE_STOCK === 'true',
};

if (env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

// "Today" boundaries (dashboard, reports) follow the shop's timezone.
process.env.TZ = env.TIMEZONE;
