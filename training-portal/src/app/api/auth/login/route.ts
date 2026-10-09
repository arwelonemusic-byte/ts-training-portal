import { NextResponse } from "next/server";
import { getOAuthURL } from "@/lib/auth/discord";
import { STATE_COOKIE } from "@/lib/auth/session";

export async function GET() {
  // CSRF guard: the callback only accepts the state this browser was given.
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(getOAuthURL(state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
