"use client";

import { useEffect, useRef, useState } from "react";
import { formatSize, type ArchiveFile } from "@/lib/archive";
import { MediaThumbnail } from "./MediaThumbnail";

export function SearchModal({ files, onClose, onSelectFile }: {
  files: ArchiveFile[];
  onClose: () => void;
  onSelectFile: (file: ArchiveFile) => void;
}) {
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const keyword = query.trim().toLowerCase();
  const results = keyword ? files.filter((file) => file.name.toLowerCase().includes(keyword)) : [];

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label="Tìm kiếm file"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="mx-auto mt-8 w-[calc(100%-2rem)] max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 text-white backdrop:bg-black/70"
    >
      <div className="flex gap-2 border-b border-zinc-800 p-4">
        <input
          type="search"
          autoFocus
          aria-label="Tên file"
          placeholder="Tìm kiếm file..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 rounded bg-zinc-800 px-3 py-2"
        />
        <button type="button" onClick={onClose} className="px-3">Đóng</button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {results.length === 0 && (
          <p className="p-6 text-center text-sm text-zinc-400">
            {keyword ? `Không tìm thấy file phù hợp với “${query}”.` : "Nhập từ khóa để tìm kiếm…"}
          </p>
        )}
        {results.map((file) => (
          <div key={file.name} className="flex items-center gap-3 border-b border-zinc-800 p-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-zinc-800">
              <MediaThumbnail file={file} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate">{file.name}</p>
              <p className="text-xs text-zinc-400">{formatSize(file.size)}</p>
            </div>
            <button type="button" className="rounded bg-blue-700 px-3 py-2" onClick={() => {
              onClose();
              onSelectFile(file);
            }}>Mở</button>
            <a href={file.url} download={file.name} className="rounded bg-green-700 px-3 py-2">Tải</a>
          </div>
        ))}
      </div>
    </dialog>
  );
}
