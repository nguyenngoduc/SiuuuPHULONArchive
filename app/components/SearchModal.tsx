"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface GitHubFile {
  name: string;
  download_url: string;
  html_url: string;
  type: string;
  size: number;
}

interface SearchResult extends GitHubFile {
  matchType: "name" | "content";
  preview?: string;
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

const BLUR_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect fill='%23333333' width='40' height='40'/%3E%3C/svg%3E";

export function SearchModal({
  files,
  isOpen,
  onClose,
  onSelectFile,
}: {
  files: GitHubFile[];
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: GitHubFile) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchQuery = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    files.forEach((file) => {
      if (file.name.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          ...file,
          matchType: "name",
        });
      }
    });

    setResults(searchResults);
  }, [query, files]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleDownload = (e: React.MouseEvent, file: GitHubFile) => {
    e.preventDefault();
    e.stopPropagation();

    const fileUrl = `/files/${encodeURIComponent(file.name)}`;
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenFile = (file: GitHubFile) => {
    onSelectFile(file);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 md:pt-20 px-4">
        <div className="w-full max-w-2xl">
          <div className="bg-[#1a1a1a] rounded-t-lg border border-b-0 border-zinc-800 shadow-lg">
            <div className="flex items-center px-4 py-3 md:py-2 gap-2">
              <svg
                className="w-5 h-5 text-zinc-500 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Tìm kiếm file..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-base"
              />
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 transition-colors md:hidden p-1"
                title="Đóng"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="text-xs text-zinc-600 hidden md:inline">ESC</span>
            </div>
          </div>

          <div
            ref={resultsContainerRef}
            className="bg-[#1a1a1a] rounded-b-lg border border-t-0 border-zinc-800 shadow-lg max-h-[60vh] md:max-h-96 overflow-y-auto"
          >
            {results.length === 0 && query && (
              <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                Không tìm thấy file nào phù hợp với "{query}"
              </div>
            )}

            {results.length === 0 && !query && (
              <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                Nhập từ khóa để tìm kiếm...
              </div>
            )}

            {results.map((result) => (
              <div
                key={result.name}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-4 text-left border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800 hover:bg-opacity-30 transition-colors cursor-pointer"
                onClick={() => handleOpenFile(result)}
              >
                <div className="flex-shrink-0 w-10 h-10 bg-zinc-700 rounded overflow-hidden relative">
                  {getFileType(result.name) === "image" && (
                    <Image
                      src={`/files/${encodeURIComponent(result.name)}`}
                      alt={result.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL={BLUR_PLACEHOLDER}
                      loading="lazy"
                    />
                  )}
                  {getFileType(result.name) === "video" && (
                    <video
                      src={`/files/${encodeURIComponent(result.name)}`}
                      className="w-full h-full object-cover"
                      muted
                      preload="none"
                      poster={BLUR_PLACEHOLDER}
                    />
                  )}
                  {getFileType(result.name) === "other" && (
                    <svg className="w-5 h-5 text-gray-400 m-auto" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm md:text-base font-medium truncate">
                    {result.name}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {getFileType(result.name) === "image"
                      ? "🖼 Image"
                      : getFileType(result.name) === "video"
                        ? "🎬 Video"
                        : "📄 File"}
                    {result.size > 0 && ` · ${formatSize(result.size)}`}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                  <button
                    onClick={(e) => handleDownload(e, result)}
                    className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-green-600 hover:bg-green-500 active:scale-95 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                    title="Tải xuống file"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span className="hidden sm:inline">Tải</span>
                  </button>
                  <button
                    onClick={() => handleOpenFile(result)}
                    className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Mở
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
