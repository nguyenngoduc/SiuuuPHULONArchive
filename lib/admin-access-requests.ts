import { neon } from "@neondatabase/serverless";

type RequestStatus = "pending" | "approved" | "rejected";
export type AccessRequest = {
  id: string;
  provider: "github" | "credentials";
  identity: string;
  username: string;
  email: string | null;
  requested_at: string;
};

function database() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  return neon(process.env.DATABASE_URL);
}

export async function getGitHubRequestStatus(id: string): Promise<RequestStatus | undefined> {
  const sql = database();
  const [request] = await sql`
    SELECT status FROM archive_auth.access_requests WHERE provider = 'github' AND identity = ${id}
  `;
  return request?.status;
}

export async function requestGitHubAccess(id: string, username: string, email?: string) {
  const sql = database();
  const [created] = await sql`
    INSERT INTO archive_auth.access_requests (provider, identity, username, email)
    VALUES ('github', ${id}, ${username}, ${email ?? null})
    ON CONFLICT (provider, identity) DO NOTHING
    RETURNING id
  `;
  return typeof created?.id === "string" ? created.id : undefined;
}

export async function requestPasswordAccess(username: string, hash: string, email: string) {
  const sql = database();
  const [created] = await sql`
    INSERT INTO archive_auth.access_requests (provider, identity, username, password_hash, email)
    SELECT 'credentials', ${username}, ${username}, ${hash}, ${email}
    WHERE NOT EXISTS (SELECT 1 FROM archive_auth.admin_users WHERE username = ${username})
    ON CONFLICT (provider, identity) DO NOTHING
    RETURNING id
  `;
  return typeof created?.id === "string" ? created.id : undefined;
}

export async function isPasswordApprover(id: string) {
  const sql = database();
  const rows = await sql`SELECT 1 FROM archive_auth.admin_users WHERE id = ${id} AND enabled AND can_approve`;
  return rows.length === 1;
}

export async function pendingAccessRequests() {
  const sql = database();
  return await sql`
    SELECT id, provider, identity, username, email, requested_at::text
    FROM archive_auth.access_requests WHERE status = 'pending'
    ORDER BY requested_at, id LIMIT 100
  ` as AccessRequest[];
}

export async function reviewAccessRequest(id: string, decision: "approved" | "rejected") {
  const sql = database();
  const updated = await sql`
    WITH pending AS (
      SELECT * FROM archive_auth.access_requests WHERE id = ${id} AND status = 'pending' FOR UPDATE
    ), new_admin AS (
      INSERT INTO archive_auth.admin_users (username, password_hash, can_approve)
      SELECT username, password_hash, false FROM pending
      WHERE provider = 'credentials' AND ${decision} = 'approved'
      ON CONFLICT (username) DO NOTHING
      RETURNING username
    )
    UPDATE archive_auth.access_requests AS request
    SET status = ${decision}, reviewed_at = now(), password_hash = NULL
    FROM pending
    WHERE request.id = pending.id
      AND (pending.provider = 'github' OR ${decision} = 'rejected'
        OR EXISTS (SELECT 1 FROM new_admin))
    RETURNING request.id
  `;
  return updated.length === 1;
}
