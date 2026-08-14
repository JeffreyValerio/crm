import type { NextApiRequest, NextApiResponse } from 'next';
import { metricsRegistry } from '@/lib/metrics';

const METRICS_TOKEN = process.env.METRICS_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  // Proteger el endpoint con Bearer token si METRICS_TOKEN está configurado
  if (METRICS_TOKEN) {
    const auth = req.headers.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token !== METRICS_TOKEN) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      return res.status(401).end('Unauthorized');
    }
  }

  try {
    const metrics = await metricsRegistry.metrics();
    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.status(200).send(metrics);
  } catch (err) {
    console.error('[metrics]', err);
    res.status(500).end('Error collecting metrics');
  }
}
