"use client";

import { useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import styles from "./login-loading.module.css";

export function LoginForm({ provider, className, children }: {
  provider: "credentials" | "github";
  className: string;
  children?: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const github = provider === "github";

  useEffect(() => {
    function restore(event: PageTransitionEvent) {
      if (event.persisted) setPending(false);
    }
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  return (
    <form action="/api/admin/sign-in" method="post" className={className} onSubmit={(event) => {
      if (pending) {
        event.preventDefault();
        return;
      }
      // Render the loader before the browser starts its document navigation.
      flushSync(() => setPending(true));
    }}>
      <input type="hidden" name="provider" value={provider} />
      {children}
      <button type="submit" disabled={pending}
        className={`rounded-lg px-4 py-2 font-medium disabled:opacity-70 ${github ? "border border-zinc-700 justify-self-start" : "bg-blue-600"}`}>
        {pending ? "Đang đăng nhập…" : github ? "Đăng nhập với GitHub" : "Đăng nhập"}
      </button>
      {pending && (
        <div role="status" className="flex justify-center text-white">
          <span className={styles.loader} aria-hidden="true" />
          <span className="sr-only">Đang đăng nhập, vui lòng chờ.</span>
        </div>
      )}
    </form>
  );
}
