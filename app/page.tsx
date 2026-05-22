"use client";

import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

interface GitHubFile {
  name: string;
  download_url: string;
  html_url: string;
  type: string;
  size: number;
}

function getFileType(filename: string): "image" | "video" | "other" {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "mkv", "webm", "m4v"].includes(ext)) return "video";
  return "other";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function VideoModal({ file, onClose }: { file: GitHubFile | null; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  const videoUrl = file
    ? `https://raw.githubusercontent.com/nguyenngoduc/SiuuuPHULONArchive/main/public/files/${encodeURIComponent(file.name)}`
    : "";

  useEffect(() => {
    if (!file || !videoRef.current) return;

    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: "auto",
      fluid: true,
      responsive: true,
    });

    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [file]);

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-lg max-w-4xl w-full max-h-screen overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <h2 className="text-white font-medium truncate">{file.name}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <video ref={videoRef} className="w-full" src={videoUrl} />
        </div>
      </div>
    </div>
  );
}

function FileThumbnail({ file }: { file: GitHubFile }) {

  const fileType = getFileType(file.name);
  const [imgError, setImgError] = useState(false);

  if (fileType === "image" && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={file.download_url}
        alt={file.name}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    );
  }

  if (fileType === "video") {
    return (
      <video
        src={file.download_url}
        className="w-full h-full object-cover"
        muted
        preload="metadata"
      />
    );
  }

  // Generic file icon
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

function FileRow({ file, onViewVideo }: { file: GitHubFile; onViewVideo: (file: GitHubFile) => void }) {
  const fileType = getFileType(file.name);

  const rawUrl = `https://raw.githubusercontent.com/nguyenngoduc/SiuuuPHULONArchive/main/public/files/${encodeURIComponent(file.name)}`;

  const handleView = () => {
    if (fileType === "video") {
      onViewVideo(file);
    } else {
      window.open(rawUrl, "_blank");
    }
  };

  return (
    <div className="flex items-center gap-4 bg-[#1a1a1a] hover:bg-[#222] transition-colors rounded-xl px-4 py-3 border border-zinc-800">
      {/* Thumbnail */}
      <div
        className="flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center"
        style={{ width: 72, height: 72 }}
      >
        <FileThumbnail file={{ ...file, download_url: rawUrl }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{file.name}</p>
        <p className="text-zinc-500 text-xs mt-0.5">
          {fileType === "image" ? "🖼 Image" : fileType === "video" ? "🎬 Video" : "📄 File"}
          {file.size > 0 && ` · ${formatSize(file.size)}`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={handleView}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-sm font-medium transition-all"
        >
          View
        </button>
        <a
          href={rawUrl}
          download={file.name}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 active:scale-95 text-white rounded-lg text-sm font-medium transition-all"
        >
          Download
        </a>
      </div>
    </div>
  );
}

export default function Home() {
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<GitHubFile | null>(null);

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

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <VideoModal file={selectedVideo} onClose={() => setSelectedVideo(null)} />

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            SiuuuPHULON Archive
          </h1>
          <p className="mt-2 text-zinc-400 text-base">
            PHULON DUYLON Song cho SIUUU
          </p>
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center gap-3 text-zinc-500 py-12 justify-center">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span>Đang tải danh sách file...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-5 py-4 text-sm">
            ⚠️ Không thể tải dữ liệu: <span className="font-mono">{error}</span>
          </div>
        )}

        {!loading && !error && files.length === 0 && (
          <p className="text-zinc-500 text-center py-12">Không có file nào trong kho lưu trữ.</p>
        )}

        {/* File list */}
        {!loading && files.length > 0 && (
          <>
            <p className="text-zinc-600 text-xs mb-4 uppercase tracking-widest font-semibold">
              {files.length} file
            </p>
            <div className="flex flex-col gap-3">
              {files.map((file) => (
                <FileRow
                  key={file.name}
                  file={file}
                  onViewVideo={setSelectedVideo}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
