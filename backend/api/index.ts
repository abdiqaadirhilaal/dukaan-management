import type { Request, Response } from 'express';
import app from '../src/app';
import { connectDB } from '../src/config/db';

let dbPromise: Promise<void> | null = null;

function ensureDB(): Promise<void> {
  if (!dbPromise) {
    dbPromise = connectDB().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

// Vercel serverless entry point. The app no longer calls app.listen() here —
// Vercel invokes this handler per request and we connect to MongoDB lazily.
export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    await ensureDB();
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    res.status(503).json({ message: 'Database connection failed' });
    return;
  }
  app(req, res);
}