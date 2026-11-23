import { pendingAccessRequests } from "@/lib/admin-access-requests";
import { accessEmailConfigured, accessEmailPendingCount } from "@/lib/admin-access-email";

const formatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok",
});

const reviewMessages = new Map([
  ["approved", "Đã duyệt yêu cầu."],
  ["rejected", "Đã từ chối yêu cầu."],
  ["conflict", "Yêu cầu đã được xử lý hoặc tên đăng nhập đã được sử dụng."],
  ["unavailable", "Chưa thể cập nhật yêu cầu. Vui lòng thử lại."],
  ["email-sent", "Đã gửi email thông báo."],
  ["email-wait", "Chưa gửi được email nào. Kiểm tra cấu hình Resend hoặc thử lại sau một phút."],
  ["email-unavailable", "Chưa thể gửi email thông báo."],
]);

export async function AccessRequests({ review }: { review?: string }) {
  const configured = accessEmailConfigured();
  const [requests, pendingEmails] = await Promise.all([
    pendingAccessRequests().catch(() => null),
    configured ? accessEmailPendingCount().catch(() => 0) : 0,
  ]);
  const message = review ? reviewMessages.get(review) : undefined;
  return (
    <section className="mx-auto mt-5 max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Yêu cầu cấp quyền</h2>
      {message && <p role="status" className="mt-3 text-sm text-zinc-300">{message}</p>}
      {configured && pendingEmails > 0 && (
        <form method="post" action="/api/admin/access-requests" className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <p className="text-zinc-400">Email đang chờ gửi: {pendingEmails}</p>
          <button name="action" value="send-emails" className="rounded-lg border border-zinc-700 px-3 py-2">Thử gửi lại</button>
        </form>
      )}
      {!requests ? (
        <p className="mt-3 text-sm text-zinc-400">Chưa thể mở danh sách yêu cầu. Kiểm tra phần thiết lập Neon.</p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">Không có yêu cầu đang chờ.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-800">
          {requests.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="break-all font-medium">{item.username}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {item.provider === "github" ? `GitHub · ID ${item.identity}` : "Username và mật khẩu"}
                  {" · "}<time dateTime={new Date(item.requested_at).toISOString()}>{formatter.format(new Date(item.requested_at))}</time>
                </p>
                {item.email && <p className="mt-1 break-all text-sm text-zinc-400">
                  {item.provider === "github" ? "Email đã xác minh qua GitHub" : "Email do người gửi khai báo"} {item.email}
                </p>}
              </div>
              <form method="post" action="/api/admin/access-requests" className="flex gap-2">
                <input type="hidden" name="id" value={item.id} />
                <button name="action" value="approved" className="rounded-lg bg-green-700 px-3 py-2 text-sm">Duyệt</button>
                <button name="action" value="rejected" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">Từ chối</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
