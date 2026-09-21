import { env } from '../config/env';

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// YYYY-MM-DD inputs are interpreted in the shop's timezone (process.env.TZ, set in config/env.ts).
export const dayRange = (from?: string, to?: string) => {
  const range: { $gte?: Date; $lte?: Date } = {};
  if (from) range.$gte = new Date(`${from}T00:00:00`);
  if (to) range.$lte = new Date(`${to}T23:59:59.999`);
  return range;
};

export const dayKey = (d: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: env.TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
