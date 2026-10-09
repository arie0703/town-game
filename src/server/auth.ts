import type { Context } from 'hono';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';

export type AuthEnv = { Variables: { userId: number } };

const COOKIE_NAME = 'uid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30日
const isProduction = process.env.NODE_ENV === 'production';

const secret = process.env.COOKIE_SECRET ?? (isProduction ? undefined : 'dev-only-cookie-secret');
if (!secret) {
  throw new Error('COOKIE_SECRET must be set in production');
}
const cookieSecret: string = secret;

export async function setLoginCookie(c: Context, userId: number): Promise<void> {
  await setSignedCookie(c, COOKIE_NAME, String(userId), cookieSecret, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProduction,
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearLoginCookie(c: Context): void {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
}

// ログイン必須の API に付けるミドルウェア。未ログインなら 401
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const value = await getSignedCookie(c, cookieSecret, COOKIE_NAME);
  const userId = value ? Number(value) : NaN;
  if (!Number.isInteger(userId)) {
    return c.json({ error: 'ログインしてください' }, 401);
  }
  c.set('userId', userId);
  await next();
});
