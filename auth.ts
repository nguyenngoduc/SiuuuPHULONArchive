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
