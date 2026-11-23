"use client";

import { useEffect, useRef, useState } from "react";
import { getFileType, type ArchiveFile } from "@/lib/archive";

export function MediaPreview({ file, onClose }: { file: ArchiveFile; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const type = getFileType(file.name);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  function close() {
    image.current?.removeAttribute("src");
    const player = video.current;
    if (player) {
      player.pause();
      player.removeAttribute("src");
      player.load();
    }
    onClose();
  }

  const error = status === "error";

  return (
    <dialog
      ref={dialog}
      aria-labelledby="preview-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-4xl rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white backdrop:bg-black/80"
    >
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h2 id="preview-title" className="min-w-0 flex-1 break-all font-medium">{file.name}</h2>
        <a href={file.url} download={file.name} className="rounded bg-green-700 px-3 py-2">Tải xuống</a>
        <button type="button" onClick={close} className="rounded bg-zinc-700 px-3 py-2">Đóng</button>
      </header>

      {type === "image" && (
        <div className="relative grid min-h-48 place-items-center overflow-hidden bg-black">
          {file.thumbnail && status !== "ready" && (
            <div
              className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-50"
              style={{ backgroundImage: `url("${file.thumbnail}")` }}
            />
          )}
          {/* The native element lets close() cancel the original request without buffering it in JavaScript. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={image}
            src={file.url}
            alt={file.name}
            decoding="async"
            onLoad={() => setStatus("ready")}
            onError={() => setStatus("error")}
            className={`relative max-h-[70vh] w-full object-contain ${status === "ready" ? "" : "invisible"}`}
          />
          {status === "loading" && <p role="status" className="absolute">Đang tải ảnh…</p>}
        </div>
      )}
      {type === "video" && (
        <video
          ref={video}
          src={file.url}
          poster={file.thumbnail}
          controls
          playsInline
          preload="none"
          onError={() => setStatus("error")}
          className="max-h-[70vh] min-h-48 w-full bg-black"
        />
      )}
      {error && <p role="alert" className="mt-3">Không thể xem tệp này. Bạn vẫn có thể thử tải xuống.</p>}
      {type === "other" && <p>Tải tệp xuống để mở trên thiết bị của bạn.</p>}
    </dialog>
  );
}
