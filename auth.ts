import NextAuth, { type Session } from "next-auth";
import { after } from "next/server";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { authenticateAdmin, isActiveAdminSession } from "@/lib/admin-accounts";
import { getGitHubRequestStatus, isPasswordApprover, requestGitHubAccess } from "@/lib/admin-access-requests";
import { sendAccessEmails, verifiedGitHubEmail } from "@/lib/admin-access-email";

declare module "next-auth" {
  interface Session {
    accessIdentity?: { provider: "github" | "credentials"; id: string };
  }
}

// Fall back to nguyenngoduc's immutable account ID for existing deployments.
const githubAdminIds = new Set(
  (process.env.ARCHIVE_ADMIN_GITHUB_IDS ?? "54198073")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[1-9]\d*$/.test(id)),
);

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
    ...(adminLogin.github ? [GitHub({ authorization: { params: { scope: "read:user user:email" } } })] : []),
  ],
  pages: { signIn: "/admin", error: "/admin" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  callbacks: {
    async signIn({ account, user, profile }) {
      if (account?.provider === "credentials") {
        return "adminSessionVersion" in user && typeof user.adminSessionVersion === "string";
      }
      if (account?.provider !== "github") return false;
      const id = account.providerAccountId;
      if (githubAdminIds.has(id)) return true;
      if (!process.env.DATABASE_URL || !/^[1-9]\d*$/.test(id)) return false;
      try {
        let status = await getGitHubRequestStatus(id);
        if (!status) {
          const username = typeof profile?.login === "string" ? profile.login.slice(0, 100) : id;
          const createdId = await requestGitHubAccess(id, username, await verifiedGitHubEmail(account.access_token));
          if (createdId) after(() => sendAccessEmails(createdId).catch(() => {}));
          status = createdId ? "pending" : await getGitHubRequestStatus(id);
        }
        if (status === "approved") return true;
        return status === "rejected" ? "/admin?access=rejected" : "/admin?access=pending";
      } catch {
        return "/admin?access=unavailable";
      }
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials") {
        if (!user || !("adminSessionVersion" in user) || typeof user.adminSessionVersion !== "string") return null;
        token.adminSessionVersion = user.adminSessionVersion;
        return token;
      }
      if (account?.provider === "github") {
        token.adminGitHubId = account.providerAccountId;
        return token;
      }
      if (typeof token.adminSessionVersion !== "string") {
        if (typeof token.adminGitHubId !== "string") return null;
        if (githubAdminIds.has(token.adminGitHubId)) return token;
        try {
          return await getGitHubRequestStatus(token.adminGitHubId) === "approved" ? token : null;
        } catch {
          return null;
        }
      }
      try {
        return token.sub && await isActiveAdminSession(token.sub, token.adminSessionVersion) ? token : null;
      } catch {
        return null;
      }
    },
    session({ session, token }) {
      if (typeof token.adminGitHubId === "string") {
        session.accessIdentity = { provider: "github", id: token.adminGitHubId };
      } else if (typeof token.adminSessionVersion === "string" && token.sub) {
        session.accessIdentity = { provider: "credentials", id: token.sub };
      }
      return session;
    },
  },
});

export async function canReviewAccess(session: Session | null) {
  const identity = session?.accessIdentity;
  if (!session?.user || !identity || !process.env.DATABASE_URL) return false;
  if (identity.provider === "github") return githubAdminIds.has(identity.id);
  try {
    return await isPasswordApprover(identity.id);
  } catch {
    return false;
  }
}

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
