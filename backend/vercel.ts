// Vercel Edge Function Entry Point
// This file wraps the main handler for Vercel deployment

import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './src/index';

export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}