const DISCORD_API = "https://discord.com/api/v10";

export function getOAuthURL(state: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds.members.read",
    state,
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${baseUrl}/api/auth/callback`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token exchange failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Failed to fetch Discord user: ${res.status}`);
  const data = await res.json();
  return { id: data.id, username: data.username, avatar: data.avatar };
}

export interface DiscordGuildMember {
  roles: string[]; // array of role IDs
  nick: string | null; // server-specific nickname
}

export async function fetchGuildMember(
  accessToken: string,
  guildId: string,
): Promise<DiscordGuildMember> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("NOT_IN_GUILD");
    }
    throw new Error(`Failed to fetch guild member: ${res.status}`);
  }

  const data = await res.json();
  console.log("Guild member response:", JSON.stringify({ nick: data.nick, user: data.user?.global_name, username: data.user?.username }));
  return { roles: data.roles, nick: data.nick ?? data.user?.global_name ?? null };
}

/** Fetch a guild member's roles using the bot token (no user OAuth needed) */
export async function fetchGuildMemberByBot(
  userId: string,
  guildId: string,
): Promise<DiscordGuildMember> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) throw new Error("DISCORD_BOT_TOKEN is not set");

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch guild member via bot: ${res.status}`);
  }

  const data = await res.json();
  return { roles: data.roles, nick: data.nick ?? data.user?.global_name ?? null };
}

/** Parse DISCORD_ROLE_MAP, tolerating a leading BOM/whitespace so a stray
 *  byte in the env var can never break auth (JSON.parse throws on a BOM). */
function parseRoleMap(): Record<string, string> {
  const mapStr = process.env.DISCORD_ROLE_MAP;
  if (!mapStr) return {};
  try {
    return JSON.parse(mapStr.replace(/^﻿/, "").trim());
  } catch (err) {
    console.error("Failed to parse DISCORD_ROLE_MAP:", err);
    return {};
  }
}

export function mapRoleIdsToNames(roleIds: string[]): string[] {
  const roleMap = parseRoleMap();
  return roleIds
    .map((id) => roleMap[id])
    .filter((name): name is string => !!name);
}

/** Reverse lookup: resolve a role name to its Discord role ID via DISCORD_ROLE_MAP. */
export function getRoleIdByName(name: string): string | null {
  const roleMap = parseRoleMap();
  for (const [id, roleName] of Object.entries(roleMap)) {
    if (roleName === name) return id;
  }
  return null;
}

/**
 * Assign one or more roles to a guild member using the bot token.
 * Returns true only if every requested role was assigned successfully.
 * Requires the bot to have Manage Roles and to sit above each target role in the hierarchy.
 * PUT is idempotent — re-granting an existing role is a harmless no-op.
 */
export async function assignRolesToMember(
  userId: string,
  guildId: string,
  roleNames: string[],
): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.error("DISCORD_BOT_TOKEN is not set — cannot assign roles");
    return false;
  }

  let allSucceeded = true;
  for (const name of roleNames) {
    const roleId = getRoleIdByName(name);
    if (!roleId) {
      console.error(`Role "${name}" not found in DISCORD_ROLE_MAP — skipping assignment`);
      allSucceeded = false;
      continue;
    }

    const res = await fetch(
      `${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "X-Audit-Log-Reason": "Auto-granted by Training Portal on tier completion",
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `Failed to assign role "${name}" (${roleId}) to ${userId}: ${res.status} ${text}`,
      );
      allSucceeded = false;
    }
  }

  return allSucceeded;
}

/** Add a reaction to a message as the bot (e.g. ✅ to mark a role as granted). */
export async function addBotReaction(
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return;

  const res = await fetch(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`,
    { method: "PUT", headers: { Authorization: `Bot ${botToken}` } },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to add bot reaction: ${res.status} ${text}`);
  } else {
    console.log(`Added bot reaction ${emoji} to message ${messageId}`);
  }
}
