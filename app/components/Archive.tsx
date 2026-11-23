"use client";

import { useEffect, useRef, useState } from "react";
import { formatSize, getFileType, type ArchiveFile } from "@/lib/archive";
import { SearchModal } from "./SearchModal";
import { MediaPreview } from "./MediaPreview";
import { MediaThumbnail } from "./MediaThumbnail";

function FileRow({ file, onView }: { file: ArchiveFile; onView: () => void }) {
  const fileType = getFileType(file.name);

  return (
    <div className="flex items-center gap-4 bg-[#1a1a1a] hover:bg-[#222] transition-colors rounded-xl px-4 py-3 border border-zinc-800">
      <div
        className="relative flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center"
        style={{ width: 72, height: 72 }}
      >
        <MediaThumbnail file={file} />
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
          onClick={onView}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-sm font-medium transition-all"
        >
          View
        </button>
        <a
          href={file.downloadUrl ?? file.url}
          download={file.name}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 active:scale-95 text-white rounded-lg text-sm font-medium transition-all"
        >
          Download
        </a>
      </div>
    </div>
  );
}

export default function Archive({
  initialFiles,
  uploadVersion = 0,
}: {
  initialFiles: ArchiveFile[];
  uploadVersion?: number;
}) {
  const [files, setFiles] = useState(initialFiles);
  const [uploads, setUploads] = useState<ArchiveFile[]>([]);
  const [syncFailed, setSyncFailed] = useState(false);
  const [blobFailed, setBlobFailed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ArchiveFile | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const bundled = new Map(initialFiles.map((file) => [file.name, file]));

    async function refresh() {
      try {
        const response = await fetch("/api/archive", { signal: controller.signal });
        if (!response.ok) throw new Error("Archive sync failed");
        const remote: ArchiveFile[] = await response.json();
        if (controller.signal.aborted) return;
        setFiles(remote.map((file) => {
          const local = bundled.get(file.name);
          if (local?.sha !== file.sha) return file;
          return { ...local, thumbnail: local.thumbnail ?? file.thumbnail };
        }));
      } catch {
        if (!controller.signal.aborted) setSyncFailed(true);
      }
    }

    void refresh();
    return () => controller.abort();
  }, [initialFiles]);

  useEffect(() => {
    const controller = new AbortController();

    async function refreshUploads() {
      try {
        const response = await fetch("/api/archive/uploads", { signal: controller.signal });
        if (!response.ok) throw new Error("Blob sync failed");
        const uploaded: ArchiveFile[] = await response.json();
        if (controller.signal.aborted) return;
        setUploads(uploaded);
        setBlobFailed(false);
      } catch {
        if (!controller.signal.aborted) setBlobFailed(true);
      }
    }

    void refreshUploads();
    return () => controller.abort();
  }, [uploadVersion]);

  const catalog = [...files, ...uploads].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        selectedFile ||
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
  }, [selectedFile]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowFloatingButton(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

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

        {syncFailed && (
          <p role="status" className="mb-4 text-sm text-zinc-400">
            Chưa thể đồng bộ GitHub. Đang hiển thị các tệp có sẵn.
          </p>
        )}
        {blobFailed && (
          <p role="status" className="mb-4 text-sm text-zinc-400">Chưa thể tải danh sách từ Blob.</p>
        )}

        {catalog.length === 0 && (
          <p className="text-zinc-500 text-center py-12">
            Không có file nào trong kho lưu trữ.
          </p>
        )}

        {catalog.length > 0 && (
          <>
            <p className="text-zinc-600 text-xs mb-4 uppercase tracking-widest font-semibold">
              {catalog.length} file
            </p>
            <div className="flex flex-col gap-3">
              {catalog.map((file) => (
                <FileRow key={file.url} file={file} onView={() => setSelectedFile(file)} />
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

      {searchOpen && (
        <SearchModal
          files={catalog}
          onClose={() => setSearchOpen(false)}
          onSelectFile={setSelectedFile}
        />
      )}
      {selectedFile && (
        <MediaPreview file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}
    </div>
  );
}
