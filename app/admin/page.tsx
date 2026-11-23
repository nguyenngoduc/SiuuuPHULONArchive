import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { adminLogin, auth, signIn, signOut } from "@/auth";
import { AdminUpload } from "./AdminUpload";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản lý kho lưu trữ", robots: { index: false, follow: false } };

async function signInWithPassword(form: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      username: form.get("username"),
      password: form.get("password"),
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/admin?error=CredentialsSignin");
    throw error;
  }
}

export default async function AdminPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = adminLogin.password || adminLogin.github;
  const session = configured ? await auth() : null;
  const { error } = await searchParams;

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
            {error && (
              <p role="alert" className="mt-5 text-sm text-red-300">
                {error === "CredentialsSignin"
                  ? "Đăng nhập không thành công. Kiểm tra tên đăng nhập và mật khẩu hoặc thử lại sau."
                  : "Không thể đăng nhập bằng tài khoản GitHub này."}
              </p>
            )}
            {adminLogin.password && (
              <form action={signInWithPassword} className="mt-5 grid max-w-sm gap-4">
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
                <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium">Đăng nhập</button>
              </form>
            )}
            {adminLogin.github && (
              <form className="mt-5" action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/admin" });
              }}>
                <button className="rounded-lg border border-zinc-700 px-4 py-2 font-medium">Đăng nhập với GitHub</button>
              </form>
            )}
          </>
        )}
      </section>
      {session?.user && <AdminUpload canManageGitHub={Boolean(process.env.ARCHIVE_GITHUB_TOKEN)} />}
    </main>
  );
}
