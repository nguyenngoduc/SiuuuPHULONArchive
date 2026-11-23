import { createHmac } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { verifyAdminPassword } from "./admin-password.mjs";

const usernamePattern = /^[a-z0-9][a-z0-9_.-]{2,39}$/u;

export async function authenticateAdmin(username: unknown, password: unknown, request: Request) {
  const connection = process.env.DATABASE_URL;
  const secret = process.env.AUTH_SECRET;
  if (!connection || !secret || typeof username !== "string" || typeof password !== "string"
    || !password || Buffer.byteLength(password) > 256) return null;

  const login = username.trim().toLowerCase();
  if (!usernamePattern.test(login)) return null;

  const sql = neon(connection);
  // Vercel sets this header at its edge. Outside Vercel, use one shared bucket.
  const ip = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim()
    : undefined;
  const bucket = createHmac("sha256", secret).update(ip ?? "unknown").digest("hex");
  const allowed = await sql`
    WITH cleanup AS (
      DELETE FROM archive_auth.login_limits WHERE expires_at <= now() AND bucket <> ${bucket}
    )
    INSERT INTO archive_auth.login_limits AS limits (bucket, attempts, expires_at)
    VALUES (${bucket}, 1, now() + interval '10 minutes')
    ON CONFLICT (bucket) DO UPDATE
      SET attempts = CASE WHEN limits.expires_at <= now() THEN 1 ELSE limits.attempts + 1 END,
          expires_at = CASE WHEN limits.expires_at <= now() THEN EXCLUDED.expires_at ELSE limits.expires_at END
      WHERE limits.expires_at <= now() OR limits.attempts < 12
    RETURNING attempts
  `;
  if (!allowed.length) return null;

  const [user] = await sql`
    SELECT id, username, password_hash, session_version FROM archive_auth.admin_users
    WHERE username = ${login} AND enabled
  ` as { id: string; username: string; password_hash: string; session_version: string }[];

  if (!(await verifyAdminPassword(password, user?.password_hash)) || !user) return null;
  return { id: user.id, name: user.username, adminSessionVersion: user.session_version };
}

export async function isActiveAdminSession(id: string, version: string) {
  const connection = process.env.DATABASE_URL;
  if (!connection) return false;
  const sql = neon(connection);
  const matches = await sql`
    SELECT 1 FROM archive_auth.admin_users
    WHERE id = ${id} AND session_version = ${version} AND enabled
  `;
  return matches.length === 1;
}
