import { NextResponse } from "next/server";
import { clearedSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/session";

// The login is shared with TS Hub, so this logs out of both.
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  const response = NextResponse.redirect(baseUrl);
  response.cookies.set(SESSION_COOKIE_NAME, "", clearedSessionCookie());
  return response;
}
