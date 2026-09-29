"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SearchModal } from "./components/SearchModal";
import { useVideoThumbnail } from "@/hooks/useVideoThumbnail";

interface GitHubFile {
  name: string;
  download_url: string;
  html_url: string;
  type: string;
  size: number;
}

function getFileType(filename: string): "image" | "video" | "other" {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext))
    return "image";
  if (["mp4", "mov", "avi", "mkv", "webm", "m4v"].includes(ext))
    return "video";
  return "other";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openVideoViewer(fileName: string, videoUrl: string): void {
  const viewer = window.open("", "_blank");
  if (!viewer) return;

  const safeTitle = escapeHtml(fileName);
  const safeSrc = escapeHtml(videoUrl);

  viewer.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <link href="https://unpkg.com/video.js/dist/video-js.css" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; background: #000; color: #fff; font-family: Arial, sans-serif; }
      body { display: flex; flex-direction: column; padding: 20px; }
      header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
      h1 { margin: 0; font-size: 18px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      a { color: #d4d4d8; text-decoration: none; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 12px; font-size: 14px; }
      main { flex: 1; display: flex; align-items: center; min-height: 0; }
      .video-js { width: 100%; height: min(78vh, 720px); background: #09090b; border-radius: 8px; overflow: hidden; }
      @media (max-width: 640px) {
        body { padding: 12px; }
        h1 { font-size: 15px; }
        .video-js { height: 70vh; }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>${safeTitle}</h1>
      <a href="${safeSrc}" download="${safeTitle}">Download</a>
    </header>
    <main>
      <video id="archive-video" class="video-js vjs-big-play-centered" controls preload="auto" playsinline>
        <source src="${safeSrc}" type="video/mp4" />
      </video>
    </main>
    <script src="https://unpkg.com/video.js/dist/video.min.js"><\/script>
    <script>
      window.addEventListener("load", function () {
        window.videojs("archive-video", {
          controls: true,
          fluid: false,
          responsive: true,
          preload: "auto"
        });
      });
    <\/script>
  </body>
</html>`);
  viewer.document.close();
  viewer.opener = null;
}

const BLUR_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 72'%3E%3Crect fill='%23333333' width='72' height='72'/%3E%3C/svg%3E";

const VIDEO_ICON = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-purple-400">
    <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H4V5h16v14zm-5.04-6.71l-2.75 3.54c-.3.42-.79.67-1.3.67-.5 0-.99-.25-1.3-.67l-2.75-3.54c-.18-.23-.29-.53-.29-.85 0-1.1.9-2 2-2 .69 0 1.29.36 1.63.89.34-.53.94-.89 1.63-.89 1.1 0 2 .9 2 2 0 .32-.11.62-.29.85z" />
  </svg>
);

function FileThumbnail({ file }: { file: GitHubFile }) {
  const fileType = getFileType(file.name);
  const [imgError, setImgError] = useState(false);
  const fileUrl = `/files/${encodeURIComponent(file.name)}`;
  const videoThumbnail = useVideoThumbnail(fileType === "video" ? fileUrl : "");

  if (fileType === "image" && !imgError) {
    return (
      <Image
        src={file.download_url}
        alt={file.name}
        fill
        sizes="72px"
        className="object-cover"
        onError={() => setImgError(true)}
        placeholder="blur"
        blurDataURL={BLUR_PLACEHOLDER}
        loading="lazy"
      />
    );
  }

  if (fileType === "video") {
    if (videoThumbnail) {
      return (
        <>
          <img src={videoThumbnail} alt={file.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            {VIDEO_ICON}
          </div>
        </>
      );
    }

    return (
      <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800">
        {VIDEO_ICON}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 text-zinc-500">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="text-[10px] uppercase font-semibold tracking-wide">
        {file.name.split(".").pop()?.toUpperCase() ?? "FILE"}
      </span>
    </div>
  );
}

function FileRow({ file }: { file: GitHubFile }) {
  const fileType = getFileType(file.name);

  const fileUrl = `/files/${encodeURIComponent(file.name)}`;

  const handleView = () => {
    if (fileType === "video") {
      openVideoViewer(file.name, fileUrl);
      return;
    }

    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex items-center gap-4 bg-[#1a1a1a] hover:bg-[#222] transition-colors rounded-xl px-4 py-3 border border-zinc-800">
      <div
        className="relative flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center"
        style={{ width: 72, height: 72 }}
      >
        <FileThumbnail file={file} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{file.name}</p>
        <p className="text-zinc-500 text-xs mt-0.5">
          {fileType === "image" ? "🖼 Image" : fileType === "video" ? "🎬 Video" : "📄 File"}
          {file.size > 0 && ` · ${formatSize(file.size)}`}
        </p>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleView}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-sm font-medium transition-all"
        >
          View
        </button>
        <a
          href={fileUrl}
          download={file.name}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 active:scale-95 text-white rounded-lg text-sm font-medium transition-all"
        >
          Download
        </a>
      </div>
    </div>
  );
}

function FileSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-[#1a1a1a] rounded-xl px-4 py-3 border border-zinc-800 animate-pulse">
      <div className="flex-shrink-0 rounded-lg bg-zinc-700" style={{ width: 72, height: 72 }} />

      <div className="flex-1 min-w-0">
        <div className="h-4 bg-zinc-700 rounded w-1/2" />
        <div className="h-3 bg-zinc-700 rounded w-1/4 mt-2" />
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <div className="h-10 w-16 bg-zinc-700 rounded-lg" />
        <div className="h-10 w-20 bg-zinc-700 rounded-lg" />
      </div>
    </div>
  );
}

export default function Home() {
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(
      "https://api.github.com/repos/nguyenngoduc/SiuuuPHULONArchive/contents/public/files",
      { headers: { Accept: "application/vnd.github+json" } }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
        return res.json();
      })
      .then((data: GitHubFile[]) => {
        const onlyFiles = data.filter((f) => f.type === "file");
        setFiles(onlyFiles);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;

      const headerRect = headerRef.current.getBoundingClientRect();
      setShowFloatingButton(headerRect.bottom < 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSelectFile = (file: GitHubFile) => {
    const fileType = getFileType(file.name);
    const fileUrl = `/files/${encodeURIComponent(file.name)}`;

    if (fileType === "video") {
      openVideoViewer(file.name, fileUrl);
      return;
    }

    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div ref={headerRef} className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              SiuuuPHULON Archive
            </h1>
            <p className="mt-2 text-zinc-400 text-base">
              PHULON DUYLON Song cho SIUUU
            </p>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span>Tìm kiếm</span>
            <span className="text-xs text-zinc-600">/</span>
          </button>
        </div>

        {loading && (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <FileSkeleton key={i} />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-5 py-4 text-sm">
            ⚠️ Không thể tải dữ liệu:{" "}
            <span className="font-mono">{error}</span>
          </div>
        )}

        {!loading && !error && files.length === 0 && (
          <p className="text-zinc-500 text-center py-12">
            Không có file nào trong kho lưu trữ.
          </p>
        )}

        {!loading && files.length > 0 && (
          <>
            <p className="text-zinc-600 text-xs mb-4 uppercase tracking-widest font-semibold">
              {files.length} file
            </p>
            <div className="flex flex-col gap-3">
              {files.map((file) => (
                <FileRow key={file.name} file={file} />
              ))}
            </div>
          </>
        )}
      </div>

      {showFloatingButton && (
        <button
          onClick={() => setSearchOpen(true)}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 md:w-16 md:h-16 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-full shadow-lg transition-all flex items-center justify-center"
          title="Tìm kiếm file"
        >
          <svg className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      )}

      <SearchModal
        files={files}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectFile={handleSelectFile}
      />
    </div>
  );
}
