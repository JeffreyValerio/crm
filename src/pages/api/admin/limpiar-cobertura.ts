import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const LOCK_FILE = join(process.cwd(), '.limpiar-cobertura.lock');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Sin permisos' });

  if (req.method === 'GET') {
    const corriendo = existsSync(LOCK_FILE);
    let pid: number | null = null;
    if (corriendo) {
      try { pid = parseInt(readFileSync(LOCK_FILE, 'utf8')); } catch { /* ignore */ }
    }
    return res.status(200).json({ corriendo, pid });
  }

  if (req.method !== 'POST') return res.status(405).end();

  if (existsSync(LOCK_FILE)) {
    return res.status(409).json({ error: 'Ya hay un proceso corriendo' });
  }

  const child = spawn('npm', ['run', 'prospects:limpiar', '--', '--ejecutar'], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });

  writeFileSync(LOCK_FILE, String(child.pid));

  child.on('close', () => {
    try { unlinkSync(LOCK_FILE); } catch { /* ignore */ }
  });

  child.unref();

  return res.status(200).json({ started: true, pid: child.pid });
}
