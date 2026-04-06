import type { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const root = process.cwd();
    const start = Date.now();

    execSync('npx tsx scripts/import-prospectos.ts', {
      cwd: root,
      timeout: 120_000,
      env: { ...process.env },
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[cron] sync-prospects completado en ${elapsed}s`);

    return res.status(200).json({ ok: true, elapsed: `${elapsed}s` });
  } catch (error: any) {
    console.error('[cron] sync-prospects error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
