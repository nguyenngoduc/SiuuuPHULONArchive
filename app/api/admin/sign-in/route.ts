import { AuthError } from "next-auth";
import { adminLogin, signIn } from "@/auth";

function seeOther(location: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  // The server signIn helper bypasses Auth.js's built-in CSRF check.
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1);
  if (!host || request.headers.get("origin") !== `${protocol}://${host}`) {
    return new Response("Nguồn yêu cầu không hợp lệ.", { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const provider = form?.get("provider");
  try {
    if (provider === "credentials" && adminLogin.password) {
      const username = form?.get("username");
      const password = form?.get("password");
      if (typeof username !== "string" || typeof password !== "string") {
        return seeOther("/admin?error=CredentialsSignin");
      }
      return seeOther(await signIn("credentials", { username, password, redirectTo: "/admin", redirect: false }));
    }
    if (provider === "github" && adminLogin.github) {
      return seeOther(await signIn("github", { redirectTo: "/admin", redirect: false }));
    }
    return new Response("Phương thức đăng nhập không hợp lệ.", { status: 400 });
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    return seeOther(provider === "credentials" ? "/admin?error=CredentialsSignin" : "/admin?error=OAuthSignin");
  }
}
