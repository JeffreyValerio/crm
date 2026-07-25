import type { NextApiRequest, NextApiResponse } from 'next';
import { scrapeCdr } from '../../../../scripts/scrape-cdr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const maxPages = req.body?.maxPages ?? 3;
  const start = Date.now();
  try {
    const result = await scrapeCdr(maxPages);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    return res.status(200).json({ ok: true, ...result, elapsed: `${elapsed}s` });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron] scrape-cdr error:', msg);
    return res.status(500).json({ error: msg });
  }
}
