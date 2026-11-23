import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { AdminUpload } from "./AdminUpload";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản lý kho lưu trữ", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = Boolean(process.env.AUTH_SECRET && process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
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
          <p className="mt-5 text-zinc-300">Đăng nhập GitHub chưa được cấu hình trên bản triển khai này.</p>
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
            {error && <p role="alert" className="mt-5 text-red-300">Không thể đăng nhập bằng tài khoản GitHub này.</p>}
            <form className="mt-5" action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/admin" });
            }}>
              <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium">Đăng nhập với GitHub</button>
            </form>
          </>
        )}
      </section>
      {session?.user && <AdminUpload />}
    </main>
  );
}
