/**
 * Signed session cookie for local mode, standing in for Supabase Auth.
 *
 * Uses Web Crypto rather than node:crypto so the same code runs in the proxy
 * (which may execute on the edge runtime) and in Server Actions.
 *
 * The signature stops a cookie from being hand-edited into another user's
 * session while demoing, which matters because the roles differ in what they
 * are allowed to see. It is not a replacement for real authentication -- local
 * mode accepts a shared demo password for every account by design.
 */

export const SESSION_COOKIE = "hr_local_session";

function secret(): string {
  return process.env.LOCAL_SESSION_SECRET || "showa-kensetsu-local-dev";
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

export async function createSessionValue(userId: string): Promise<string> {
  return `${userId}.${await sign(userId)}`;
}

/** Returns the user id, or null if the cookie is missing or tampered with. */
export async function readSessionValue(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const userId = value.slice(0, separator);
  const expected = await sign(userId);
  // Length-independent comparison is unnecessary here (both are fixed-length
  // base64url digests) but the constant-time habit costs nothing.
  if (expected.length !== value.length - separator - 1) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ value.charCodeAt(separator + 1 + i);
  }
  return diff === 0 ? userId : null;
}
