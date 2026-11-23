"use client";

import Script from "next/script";
import { createElement, useEffect, useRef, useState } from "react";
import { getFileType, type ArchiveFile } from "@/lib/archive";

const videoJsUrl = "https://cdn.jsdelivr.net/npm/@videojs/cdn@10.6.0/video-neutral.js";

type Player = "videojs" | "native";

function stopPreviewVideo(video: HTMLVideoElement | null) {
  if (!video) return;
  video.pause();
  video.removeAttribute("src");
  video.load();
}

export function MediaPreview({ file, onClose }: { file: ArchiveFile; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const type = getFileType(file.name);

  const [player, setPlayer] = useState<Player>("videojs");
  const [cdn, setCdn] = useState<"loading" | "ready" | "failed">("loading");
  const resumeAt = useRef(0);
  const modern = player === "videojs" && cdn === "ready";
  const loading = type === "video" && player === "videojs" && cdn === "loading";

  useEffect(() => {
    if (!loading) return;
    const timeout = window.setTimeout(() => setCdn("failed"), 7000);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  function selectPlayer(next: Player) {
    if (next === player) return;
    const current = video.current;
    if (current && current.readyState > 0) resumeAt.current = current.currentTime;
    stopPreviewVideo(current);
    setStatus("loading");
    setPlayer(next);
  }

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  function close() {
    image.current?.removeAttribute("src");
    stopPreviewVideo(video.current);
    onClose();
  }

  const selected = cdn === "failed" ? "native" : player;
  const media = (
    <video
      ref={video}
      src={file.url}
      poster={modern ? undefined : file.thumbnail}
      controls={!modern}
      playsInline
      preload="none"
      onLoadedMetadata={(event) => {
        const element = event.currentTarget;
        if (resumeAt.current > 0) {
          element.currentTime = Math.min(resumeAt.current, element.duration);
          resumeAt.current = 0;
        }
      }}
      onError={() => setStatus("error")}
      className="h-full w-full bg-black object-contain"
    />
  );

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
        {type === "image" && (
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="rounded bg-zinc-700 px-3 py-2">
            Mở ảnh trong tab mới
          </a>
        )}
        {type === "video" && (
          <select
            aria-label="Trình phát video"
            value={selected}
            onChange={(event) => selectPlayer(event.target.value === "native" ? "native" : "videojs")}
            className="max-w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
          >
            <option value="videojs" disabled={cdn === "failed"}>Video.js</option>
            <option value="native">Trình phát trình duyệt</option>
          </select>
        )}
        <a href={file.downloadUrl ?? file.url} download={file.name} className="rounded bg-green-700 px-3 py-2">Tải xuống</a>
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
        <>
          {loading && (
            <Script
              src={videoJsUrl}
              type="module"
              onReady={() => {
                const registered = customElements.get("video-player") && customElements.get("video-neutral-skin");
                setCdn((state) => state === "failed" ? state : registered ? "ready" : "failed");
              }}
              onError={() => setCdn("failed")}
            />
          )}
          <div className="aspect-video max-h-[70vh] min-h-44 overflow-hidden rounded-lg bg-black">
            {loading ? (
              <div
                className="grid h-full place-items-center bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: file.thumbnail ? `url("${file.thumbnail}")` : undefined }}
              >
                <p role="status" className="rounded bg-black/80 px-3 py-2 text-sm">Đang tải trình phát…</p>
              </div>
            ) : modern ? createElement(
              "video-player",
              { poster: file.thumbnail },
              createElement("video-neutral-skin", { className: "h-full w-full" }, media),
            ) : media}
          </div>
          {cdn === "failed" && (
            <p role="status" className="mt-2 text-sm text-zinc-400">
              Không tải được Video.js. Đang dùng trình phát trình duyệt.
            </p>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-3">Không thể xem tệp này. Bạn vẫn có thể thử tải xuống.</p>}
      {type === "other" && <p>Tải tệp xuống để mở trên thiết bị của bạn.</p>}
    </dialog>
  );
}
