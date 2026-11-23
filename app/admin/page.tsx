import Link from "next/link";
import { adminLogin, auth, canReviewAccess, signOut } from "@/auth";
import { AdminUpload } from "./AdminUpload";
import { AccessRequests } from "./AccessRequests";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản lý kho lưu trữ", robots: { index: false, follow: false } };

const accessMessages = new Map([
  ["pending", "Yêu cầu liên kết GitHub đang chờ quản trị viên xét duyệt. Dự kiến trong vòng 72 giờ. Sau khi được duyệt, hãy đăng nhập lại bằng đúng tài khoản GitHub đã gửi yêu cầu."],
  ["submitted", "Nếu tên đăng nhập còn trống, yêu cầu sẽ được ghi nhận. Vui lòng chờ quản trị viên xét duyệt trong vòng 72 giờ, sau đó đăng nhập bằng tên và mật khẩu đã đăng ký."],
  ["rejected", "Quản trị viên đã từ chối yêu cầu liên kết GitHub này."],
  ["invalid", "Kiểm tra tên đăng nhập, email và nhập lại hai mật khẩu giống nhau. Mật khẩu cần ít nhất 14 ký tự và tối đa 256 byte UTF-8."],
  ["limited", "Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau vài phút."],
  ["unavailable", "Chưa thể gửi yêu cầu. Vui lòng thử lại sau."],
]);

export default async function AdminPage({ searchParams }: {
  searchParams: Promise<{ error?: string; access?: string; review?: string }>;
}) {
  const configured = adminLogin.password || adminLogin.github;
  const session = configured ? await auth() : null;
  const { error, access, review } = await searchParams;
  const accessMessage = access ? accessMessages.get(access) : undefined;
  const canReview = await canReviewAccess(session);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <section className="mx-auto max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Quản lý kho lưu trữ</h1>
          <Link href="/" className="text-sm text-blue-300 hover:underline">Mở kho công khai</Link>
        </div>
        {!configured ? (
          <p className="mt-5 text-zinc-300">Đăng nhập chưa được cấu hình trên bản triển khai này.</p>
        ) : session?.user ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-300">{session.user.name ?? "Quản trị viên"}</p>
            <form action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin" });
            }}>
              <button className="rounded-lg border border-zinc-700 px-4 py-2">Đăng xuất</button>
            </form>
          </div>
        ) : (
          <>
            {accessMessage && (
              <p role="status" className="mt-5 max-w-xl rounded-lg border border-zinc-700 p-3 text-sm text-zinc-200">
                {accessMessage}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-5 text-sm text-red-300">
                {error === "CredentialsSignin"
                  ? "Đăng nhập không thành công. Kiểm tra tên đăng nhập và mật khẩu hoặc thử lại sau."
                  : error === "AccessDenied"
                    ? "Tài khoản GitHub này chưa được cấp quyền quản trị dự án."
                    : "Không thể đăng nhập bằng GitHub. Vui lòng thử lại."}
              </p>
            )}
            {adminLogin.password && (
              <LoginForm provider="credentials" className="mt-5 grid max-w-sm gap-4">
                <label className="grid gap-1.5 text-sm">
                  Tên đăng nhập
                  <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
                    required maxLength={40} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-base" />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Mật khẩu
                  <input name="password" type="password" autoComplete="current-password" required maxLength={256}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-base" />
                </label>
              </LoginForm>
            )}
            {adminLogin.github && (
              <LoginForm provider="github" className="mt-5 grid max-w-sm gap-4" />
            )}
            {adminLogin.password && (
              <details className="mt-5 max-w-sm border-t border-zinc-800 pt-4"
                open={access === "invalid" || access === "limited"}>
                <summary className="cursor-pointer text-sm font-medium text-blue-300">Tạo tài khoản và gửi yêu cầu</summary>
                <form action="/api/admin/access-requests" method="post" className="mt-4 grid gap-4">
                  <input type="hidden" name="action" value="request" />
                  <p className="text-sm text-zinc-400">Chọn tên đăng nhập và mật khẩu. Quản trị viên sẽ xét duyệt yêu cầu trong vòng 72 giờ.</p>
                  <label className="grid gap-1.5 text-sm">
                    Tên đăng nhập mới
                    <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
                      pattern="[a-zA-Z0-9][a-zA-Z0-9_.\-]{2,39}" required minLength={3} maxLength={40}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-base" />
                  </label>
                  <p className="-mt-2 text-xs text-zinc-400">3–40 ký tự. Bắt đầu bằng chữ hoặc số, có thể dùng dấu chấm, gạch dưới và gạch ngang.</p>
                  <label className="grid gap-1.5 text-sm">
                    Email nhận kết quả
                    <input name="email" type="email" autoComplete="email" required maxLength={254}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-base" />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    Mật khẩu mới
                    <input name="password" type="password" autoComplete="new-password" required minLength={14} maxLength={256}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-base" />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    Nhập lại mật khẩu
                    <input name="confirmation" type="password" autoComplete="new-password" required minLength={14} maxLength={256}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-base" />
                  </label>
                  <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium">Gửi yêu cầu tạo tài khoản</button>
                </form>
              </details>
            )}
          </>
        )}
      </section>
      {canReview && <AccessRequests review={review} />}
      {session?.user && <AdminUpload canManageGitHub={Boolean(process.env.ARCHIVE_GITHUB_TOKEN)} />}
    </main>
  );
}
