import { neon } from "@neondatabase/serverless";

const adminUrl = "https://phulon-archive.vercel.app/admin";

type EmailEvent = {
  request_id: string;
  event: "submitted" | "approved" | "rejected";
  username: string;
  provider: "github" | "credentials";
  email: string | null;
};

export function normalizeContactEmail(value: unknown) {
  if (typeof value !== "string") return;
  const email = value.trim();
  return email.length <= 254 && /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/u.test(email) ? email : undefined;
}

export async function verifiedGitHubEmail(token?: string) {
  if (!token) return;
  try {
    const response = await fetch("https://api.github.com/user/emails", {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return;
    const emails: { verified: boolean; primary: boolean; email: string }[] = await response.json();
    const entry = emails.find((email) => email.verified === true && email.primary)
      ?? emails.find((email) => email.verified === true);
    return normalizeContactEmail(entry?.email);
  } catch {
    return;
  }
}

export function accessEmailConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.RESEND_API_KEY && process.env.ARCHIVE_EMAIL_FROM
    && normalizeContactEmail(process.env.ARCHIVE_REVIEW_EMAIL));
}

export async function accessEmailPendingCount() {
  if (!process.env.DATABASE_URL) return 0;
  const sql = neon(process.env.DATABASE_URL);
  const [row] = await sql`SELECT count(*) FROM archive_auth.access_email_outbox WHERE sent_at IS NULL`;
  return Number(row.count);
}

export async function sendAccessEmails(requestId?: string) {
  const { DATABASE_URL, RESEND_API_KEY, ARCHIVE_EMAIL_FROM } = process.env;
  const reviewEmail = normalizeContactEmail(process.env.ARCHIVE_REVIEW_EMAIL);
  if (!DATABASE_URL || !RESEND_API_KEY || !ARCHIVE_EMAIL_FROM || !reviewEmail) return 0;
  const sql = neon(DATABASE_URL);
  const rows = await sql`
    WITH ready AS (
      SELECT request_id, event FROM archive_auth.access_email_outbox
      WHERE sent_at IS NULL AND next_attempt_at <= now()
        AND (${requestId ?? null}::uuid IS NULL OR request_id = ${requestId ?? null}::uuid)
      ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED
    )
    UPDATE archive_auth.access_email_outbox AS outbox
    SET next_attempt_at = now() + interval '1 minute'
    FROM ready JOIN archive_auth.access_requests AS request ON request.id = ready.request_id
    WHERE outbox.request_id = ready.request_id AND outbox.event = ready.event
    RETURNING outbox.request_id, outbox.event, request.username, request.provider, request.email
  ` as EmailEvent[];

  const deliveries = await Promise.allSettled(rows.map(async (item) => {
    const submitted = item.event === "submitted";
    const approved = item.event === "approved";
    const recipient = submitted ? reviewEmail : item.email;
    if (!recipient) return false;
    const method = item.provider === "github" ? "GitHub" : "tên đăng nhập và mật khẩu";
    const subject = submitted ? "PHULON Archive · Có yêu cầu cấp quyền mới"
      : approved ? "PHULON Archive · Yêu cầu đã được duyệt" : "PHULON Archive · Kết quả xét duyệt";
    const message = submitted
      ? `Tài khoản ${item.username} đã gửi yêu cầu qua ${method}. Mở trang quản trị để xét duyệt:\n${adminUrl}`
      : approved
        ? `Yêu cầu của ${item.username} đã được duyệt. Bạn có thể đăng nhập bằng ${method} tại:\n${adminUrl}`
        : `Yêu cầu cấp quyền của ${item.username} đã bị từ chối. Liên hệ quản trị viên nếu cần hỗ trợ.`;
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `archive-access-${item.request_id}-${item.event}`,
      },
      body: JSON.stringify({ from: ARCHIVE_EMAIL_FROM, to: [recipient], subject, text: message }),
      signal: AbortSignal.timeout(5000),
    });
    if (!result.ok) return false;
    await sql`
      UPDATE archive_auth.access_email_outbox SET sent_at = now()
      WHERE request_id = ${item.request_id} AND event = ${item.event}
    `;
    return true;
  }));
  return deliveries.filter((result) => result.status === "fulfilled" && result.value).length;
}
