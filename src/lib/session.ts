import { IronSessionOptions, getIronSession } from 'iron-session';
import { NextApiRequest, NextApiResponse } from 'next';

export interface SessionData {
  userId?: string;
  email?: string;
  role?: string;
}

declare module 'iron-session' {
  interface IronSessionData {
    userId?: string;
    email?: string;
    role?: string;
  }
}

export const sessionOptions: IronSessionOptions = {
  password: process.env.SESSION_SECRET || 'changeme-to-a-random-secret-key-at-least-32-characters-long',
  cookieName: 'crm-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(req: NextApiRequest, res: NextApiResponse) {
  return await getIronSession(req, res, sessionOptions);
}