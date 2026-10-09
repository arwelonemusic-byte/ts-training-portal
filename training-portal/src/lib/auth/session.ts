import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/*
 * The Tactical Shift login, shared by the Training Portal and TS Hub (ts-hub docs/shared-login.md): one
 * HS256 cookie, `ts_auth`, set on the parent domain in production (AUTH_COOKIE_DOMAIN=tacticalshift.ru) and
 * signed with TS_AUTH_SECRET, the same value in both apps' env files. Log in on either site and both see
 * you; log out on either and both forget you. In dev the cookie stays on localhost. TS Hub's
 * web/src/lib/auth/session.ts has the same cookie, payload and options: change both together.
 */
export const SESSION_COOKIE_NAME = "ts_auth";
/** CSRF guard for the OAuth round-trip (this site only). */
export const STATE_COOKIE = "ts_portal_oauth_state";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  userId: string;
  username: string;
  displayName: string; // server nickname or username
  avatar: string | null;
  roles: string[];
}

function getSecret() {
  const secret = process.env.TS_AUTH_SECRET;
  if (!secret) throw new Error("TS_AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** The shared login cookie: on the parent domain when AUTH_COOKIE_DOMAIN is set. */
export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {}),
  };
}

/** Logging out: the same name, path and domain, expired — a cookie set on the parent domain only goes this way. */
export function clearedSessionCookie() {
  return { ...sessionCookieOptions(), maxAge: 0 };
}
