import { after } from "next/server";
import { adminLogin, auth, canReviewAccess } from "@/auth";
import { accessEmailConfigured, normalizeContactEmail, sendAccessEmails } from "@/lib/admin-access-email";
import { requestPasswordAccess, reviewAccessRequest } from "@/lib/admin-access-requests";
import { allowAdminAttempt, normalizeAdminUsername } from "@/lib/admin-accounts";
import { hashAdminPassword } from "@/lib/admin-password.mjs";
import { isSameOriginPost } from "@/lib/request-origin";

function redirectToAdmin(query: string) {
  return new Response(null, { status: 303, headers: { Location: `/admin?${query}`, "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOriginPost(request)) return new Response("Nguồn yêu cầu không hợp lệ.", { status: 403 });
  const form = await request.formData().catch(() => null);
  const action = form?.get("action");

  if (action === "request" && adminLogin.password) {
    const username = normalizeAdminUsername(form?.get("username"));
    const password = form?.get("password");
    const email = normalizeContactEmail(form?.get("email"));
    if (!username || !email || typeof password !== "string" || password !== form?.get("confirmation")
      || Buffer.byteLength(password) > 256 || [...password].length < 14) {
      return redirectToAdmin("access=invalid");
    }
    try {
      if (!(await allowAdminAttempt(request, "registration"))) return redirectToAdmin("access=limited");
      const id = await requestPasswordAccess(username, await hashAdminPassword(password), email);
      if (id) after(() => sendAccessEmails(id).catch(() => {}));
      return redirectToAdmin("access=submitted");
    } catch {
      return redirectToAdmin("access=unavailable");
    }
  }

  if (action === "approved" || action === "rejected") {
    if (!(await canReviewAccess(await auth()))) return new Response("Bạn chưa được cấp quyền duyệt.", { status: 403 });
    const id = form?.get("id");
    if (typeof id !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
      return new Response("Yêu cầu không hợp lệ.", { status: 400 });
    }
    try {
      const updated = await reviewAccessRequest(id, action);
      if (updated) after(() => sendAccessEmails(id).catch(() => {}));
      return redirectToAdmin(updated ? `review=${action}` : "review=conflict");
    } catch {
      return redirectToAdmin("review=unavailable");
    }
  }

  if (action === "send-emails") {
    if (!(await canReviewAccess(await auth()))) return new Response("Bạn chưa được cấp quyền.", { status: 403 });
    if (!accessEmailConfigured()) return redirectToAdmin("review=email-unavailable");
    try {
      const sent = await sendAccessEmails();
      return redirectToAdmin(sent > 0 ? "review=email-sent" : "review=email-wait");
    } catch {
      return redirectToAdmin("review=email-unavailable");
    }
  }

  return new Response("Yêu cầu không hợp lệ.", { status: 400 });
}
