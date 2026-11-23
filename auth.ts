import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { authenticateAdmin, isActiveAdminSession } from "@/lib/admin-accounts";

// GitHub's immutable account ID for nguyenngoduc.
const adminAccountId = "54198073";

export const adminLogin = {
  password: Boolean(process.env.AUTH_SECRET && process.env.DATABASE_URL),
  github: Boolean(process.env.AUTH_SECRET && process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    ...(adminLogin.password ? [Credentials({
      name: "Tên đăng nhập và mật khẩu",
      credentials: { username: { type: "text" }, password: { type: "password" } },
      async authorize(credentials, request) {
        try {
          return await authenticateAdmin(credentials.username, credentials.password, request);
        } catch {
          console.error("Admin password authentication database or password verification failed.");
          return null;
        }
      },
    })] : []),
    ...(adminLogin.github ? [GitHub({ authorization: { params: { scope: "read:user" } } })] : []),
  ],
  pages: { signIn: "/admin", error: "/admin" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  callbacks: {
    signIn({ account, user }) {
      if (account?.provider === "credentials") {
        return "adminSessionVersion" in user && typeof user.adminSessionVersion === "string";
      }
      return account?.provider === "github" && account.providerAccountId === adminAccountId;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials") {
        if (!user || !("adminSessionVersion" in user) || typeof user.adminSessionVersion !== "string") return null;
        token.adminSessionVersion = user.adminSessionVersion;
        return token;
      }
      // Existing GitHub sessions do not depend on the password database.
      if (typeof token.adminSessionVersion !== "string") return token;
      try {
        return token.sub && await isActiveAdminSession(token.sub, token.adminSessionVersion) ? token : null;
      } catch {
        return null;
      }
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
