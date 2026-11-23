"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import styles from "./login-loading.module.css";

function animateFavicon() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const context = canvas.getContext("2d");
  if (!context) return;

  const frames = Array.from({ length: 8 }, (_, frame) => {
    context.clearRect(0, 0, 32, 32);
    for (let dot = 0; dot < 8; dot++) {
      const angle = dot * Math.PI / 4;
      context.globalAlpha = 1 - ((frame - dot + 8) % 8) / 10;
      context.fillStyle = "#3b82f6";
      context.beginPath();
      context.arc(16 + 10 * Math.cos(angle), 16 + 10 * Math.sin(angle), 2.5, 0, Math.PI * 2);
      context.fill();
    }
    return canvas.toDataURL("image/png");
  });

  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/png";
  icon.sizes.add("32x32");
  icon.href = frames[0];
  document.head.append(icon);

  let frame = 0;
  const timer = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? undefined : window.setInterval(() => {
    frame = (frame + 1) % frames.length;
    icon.href = frames[frame];
  }, 125);

  function restore() {
    window.clearInterval(timer);
    icon.remove();
  }

  window.addEventListener("pagehide", restore, { once: true });
  return () => {
    window.removeEventListener("pagehide", restore);
    restore();
  };
}

export function LoginSubmit({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();

  useEffect(() => {
    if (pending) return animateFavicon();
  }, [pending]);

  return (
    <>
      <button type="submit" disabled={pending} className={`${className} disabled:opacity-70`}>
        {pending ? "Đang đăng nhập…" : label}
      </button>
      {pending && (
        <div role="status" className="mt-3 flex justify-center text-white">
          <span className={styles.loader} aria-hidden="true" />
          <span className="sr-only">Đang đăng nhập, vui lòng chờ.</span>
        </div>
      )}
    </>
  );
}
