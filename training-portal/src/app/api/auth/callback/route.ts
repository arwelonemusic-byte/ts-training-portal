import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, fetchDiscordUser, fetchGuildMember, mapRoleIdsToNames } from "@/lib/auth/discord";
import { createSessionToken, sessionCookieOptions, STATE_COOKIE } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?error=no_code`);
  }
  if (!state || state !== request.cookies.get(STATE_COOKIE)?.value) {
    return NextResponse.redirect(`${baseUrl}/?error=auth_failed`);
  }

  try {
    const accessToken = await exchangeCode(code);
    const user = await fetchDiscordUser(accessToken);

    let roles: string[] = [];
    let serverNick: string | null = null;
    try {
      const guildId = process.env.DISCORD_GUILD_ID!;
      const member = await fetchGuildMember(accessToken, guildId);
      roles = mapRoleIdsToNames(member.roles);
      serverNick = member.nick;
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_IN_GUILD") {
        return NextResponse.redirect(`${baseUrl}/?error=not_in_guild`);
      }
      throw err;
    }

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      displayName: serverNick ?? user.username,
      avatar: user.avatar,
      roles,
    });

    const response = NextResponse.redirect(baseUrl);
    const cookieOpts = sessionCookieOptions();
    response.cookies.set(cookieOpts.name, token, cookieOpts);
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/?error=auth_failed`);
  }
}
