import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// GitHub's immutable account ID for nguyenngoduc.
const adminAccountId = "54198073";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub({ authorization: { params: { scope: "read:user" } } })],
  pages: { signIn: "/admin", error: "/admin" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  callbacks: {
    signIn({ account }) {
      return account?.provider === "github" && account.providerAccountId === adminAccountId;
    },
  },
});

export async function verifyAdminRequest(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && origin !== `https://${host}` && origin !== `http://${host}`) {
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  }
  if (!(await auth())?.user) {
    return Response.json({ error: "Bạn cần đăng nhập bằng tài khoản quản trị." }, { status: 401 });
  }
}
