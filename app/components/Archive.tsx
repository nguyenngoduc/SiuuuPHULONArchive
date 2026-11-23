"use client";

import { useEffect, useRef, useState } from "react";
import { formatArchiveDate, formatSize, getFileType, sortArchive, type ArchiveFile, type ArchiveSort } from "@/lib/archive";
import { SearchModal } from "./SearchModal";
import { MediaPreview } from "./MediaPreview";
import { MediaThumbnail } from "./MediaThumbnail";
import { ManageFileDialog } from "./ManageFileDialog";

type ManagementAction = "rename" | "delete";

function FileRow({ file, onView, onManage }: {
  file: ArchiveFile;
  onView: () => void;
  onManage?: (action: ManagementAction) => void;
}) {
  const fileType = getFileType(file.name);

  return (
    <div className="flex flex-wrap items-center gap-3 bg-[#1a1a1a] hover:bg-[#222] transition-colors rounded-xl px-4 py-3 border border-zinc-800">
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
          {" · "}<time dateTime={file.date}>{formatArchiveDate(file.date)}</time>
        </p>
      </div>

      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
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
        {onManage && (
          <>
            <button type="button" onClick={() => onManage("rename")} className="rounded-lg bg-zinc-700 px-3 py-2 text-sm">Đổi tên</button>
            <button type="button" onClick={() => onManage("delete")} className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-200">Xóa</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Archive({
  initialFiles,
  uploadVersion = 0,
  management,
}: {
  initialFiles: ArchiveFile[];
  uploadVersion?: number;
  management?: { github: boolean };
}) {
  const [files, setFiles] = useState(initialFiles);
  const [uploads, setUploads] = useState<ArchiveFile[]>([]);
  const [syncFailed, setSyncFailed] = useState(false);
  const [blobFailed, setBlobFailed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ArchiveFile | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [sort, setSort] = useState<ArchiveSort>("name-asc");
  const [edit, setEdit] = useState<{ file: ArchiveFile; action: ManagementAction } | null>(null);
  const [editedAt, setEditedAt] = useState(0);
  const [editMessage, setEditMessage] = useState("");
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const bundled = new Map(initialFiles.map((file) => [file.name, file]));

    async function refresh() {
      try {
        const url = editedAt ? `/api/archive?refresh=${editedAt}` : "/api/archive";
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Archive sync failed");
        const remote: ArchiveFile[] = await response.json();
        if (controller.signal.aborted) return;
        setFiles(remote.map((file) => {
          const local = bundled.get(file.name);
          if (local?.sha !== file.sha) return file;
          return { ...local, date: local.date ?? file.date, thumbnail: local.thumbnail ?? file.thumbnail };
        }));
        setSyncFailed(false);
      } catch {
        if (!controller.signal.aborted) setSyncFailed(true);
      }
    }

    void refresh();
    return () => controller.abort();
  }, [initialFiles, editedAt]);

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
  }, [uploadVersion, editedAt]);

  const catalog = sortArchive([...files, ...uploads], sort);

  function completeEdit() {
    if (!edit) return;
    if (edit.action === "delete") {
      const keep = (file: ArchiveFile) => file.url !== edit.file.url;
      if (edit.file.blobPath) setUploads((previous) => previous.filter(keep));
      else setFiles((previous) => previous.filter(keep));
    }
    setEditMessage(edit.action === "delete" ? "Đã xóa tệp." : "Đã đổi tên tệp.");
    setEdit(null);
    setEditedAt(Date.now());
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        selectedFile || edit ||
        e.target instanceof HTMLSelectElement ||
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
  }, [selectedFile, edit]);

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
        {management && !management.github && files.length > 0 && (
          <p className="mb-4 text-sm text-zinc-400">Đổi tên và xóa tệp GitHub cần quyền ghi vào repo. Tệp tải lên Blob có thể chỉnh sửa ngay.</p>
        )}
        {editMessage && <p role="status" className="mb-4 text-sm text-zinc-300">{editMessage}</p>}

        {catalog.length === 0 && (
          <p className="text-zinc-500 text-center py-12">
            Không có file nào trong kho lưu trữ.
          </p>
        )}

        {catalog.length > 0 && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">{catalog.length} tệp</p>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                Sắp xếp
                <select className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-white" value={sort}
                  onChange={(event) => setSort(event.target.value as ArchiveSort)}>
                  <option value="name-asc">Tên A–Z</option>
                  <option value="name-desc">Tên Z–A</option>
                  <option value="date-desc">Ngày mới nhất</option>
                  <option value="date-asc">Ngày cũ nhất</option>
                  <option value="size-desc">Kích thước lớn nhất</option>
                  <option value="size-asc">Kích thước nhỏ nhất</option>
                </select>
              </label>
            </div>
            <div className="flex flex-col gap-3">
              {catalog.map((file) => (
                <FileRow key={file.url} file={file} onView={() => setSelectedFile(file)}
                  onManage={management && (file.blobPath || management.github)
                    ? (action) => setEdit({ file, action }) : undefined}
                />
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
      {edit && <ManageFileDialog {...edit} onClose={() => setEdit(null)} onSaved={completeEdit} />}
    </div>
  );
}
