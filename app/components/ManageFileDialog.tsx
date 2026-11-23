"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ArchiveFile } from "@/lib/archive";

export function ManageFileDialog({ file, action, onClose, onSaved }: {
  file: ArchiveFile;
  action: "rename" | "delete";
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const renaming = action === "rename";

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const newName = renaming ? String(new FormData(event.currentTarget).get("name") ?? "").trim() : undefined;
    if (newName === file.name) {
      onClose();
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action, source: file.blobPath ? "blob" : "github", name: file.name,
          sha: file.sha, blobPath: file.blobPath, newName,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Không thể cập nhật tệp.");
        return;
      }
      onSaved();
    } catch {
      setError("Mất kết nối. Hãy tải lại danh sách để kiểm tra kết quả.");
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="manage-file-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 text-white backdrop:bg-black/80"
    >
      <h2 id="manage-file-title" className="text-lg font-semibold">{renaming ? "Đổi tên tệp" : "Xóa tệp"}</h2>
      <form onSubmit={save} className="mt-4">
        {renaming ? (
          <label className="block text-sm">
            Tên mới (giữ nguyên đuôi tệp)
            <input
              name="name" defaultValue={file.name} required maxLength={180} autoFocus disabled={pending}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2"
            />
          </label>
        ) : <p className="break-all text-sm text-zinc-300">Xóa “{file.name}” khỏi kho công khai?</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" autoFocus={!renaming} disabled={pending} onClick={onClose} className="rounded-lg bg-zinc-700 px-4 py-2">
            Hủy
          </button>
          <button disabled={pending} className={`rounded-lg px-4 py-2 disabled:opacity-50 ${renaming ? "bg-blue-700" : "bg-red-700"}`}>
            {pending ? "Đang xử lý…" : renaming ? "Lưu tên" : "Xóa tệp"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
