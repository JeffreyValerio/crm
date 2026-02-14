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

// Cookie secure solo cuando la app se sirve por HTTPS (así en local con DATABASE_URL de producción funciona el login)
const appUrl = process.env.NEXT_PUBLIC_URL || '';
const useSecureCookie = appUrl.startsWith('https');

export const sessionOptions: IronSessionOptions = {
  password: process.env.SESSION_SECRET || 'changeme-to-a-random-secret-key-at-least-32-characters-long',
  cookieName: 'crm-session',
  cookieOptions: {
    secure: useSecureCookie,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(req: NextApiRequest, res: NextApiResponse) {
  return await getIronSession(req, res, sessionOptions);
}