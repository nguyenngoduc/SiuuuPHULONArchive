"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState, type FormEvent } from "react";
import Archive from "@/app/components/Archive";
import { formatSize, type ArchiveFile } from "@/lib/archive";
import { maximumUploadSize, parseUploadPath, uploadContentType } from "@/lib/archive-upload";

const emptyCatalog: ArchiveFile[] = [];

async function createThumbnail(file: File, isVideo: boolean): Promise<Blob | null> {
  const source = URL.createObjectURL(file);
  const media = isVideo ? document.createElement("video") : new Image();
  try {
    const loaded = await new Promise<boolean>((resolve) => {
      const finish = (success: boolean) => {
        window.clearTimeout(timeout);
        resolve(success);
      };
      const timeout = window.setTimeout(() => finish(false), 4000);
      media.onerror = () => finish(false);
      if (media instanceof HTMLVideoElement) {
        media.preload = "auto";
        media.onloadeddata = () => finish(true);
      } else {
        media.onload = () => finish(true);
      }
      media.src = source;
    });
    if (!loaded) return null;

    const width = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
    const height = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
    if (!width || !height) return null;
    const canvas = document.createElement("canvas");
    const scale = Math.min(240 / Math.max(width, height), 1);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(media, 0, 0, canvas.width, canvas.height);
    const thumbnail = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.7));
    return thumbnail?.type === "image/webp" ? thumbnail : null;
  } finally {
    media.removeAttribute("src");
    if (media instanceof HTMLVideoElement) media.load();
    URL.revokeObjectURL(source);
  }
}

export function AdminUpload({ canManageGitHub }: { canManageGitHub: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<{ name: string; index: number; total: number; percentage: number } | null>(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadVersion, setUploadVersion] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    const files = Array.from(input.current?.files ?? []);
    setMessage("");
    setErrors([]);
    if (!files.length) {
      setErrors(["Chọn ít nhất một ảnh hoặc video."]);
      return;
    }

    const controller = new AbortController();
    active.current = controller;
    const failures: string[] = [];
    let completed = 0;
    let withoutThumbnail = 0;
    const options = {
      access: "public" as const,
      handleUploadUrl: "/api/admin/upload",
      abortSignal: controller.signal,
    };

    try {
      for (const [index, file] of files.entries()) {
        if (controller.signal.aborted) break;
        const contentType = uploadContentType(file.name);
        const folder = `archive/${crypto.randomUUID()}`;
        const pathname = `${folder}/original/${file.name}`;
        if (!contentType || !parseUploadPath(pathname)) {
          failures.push(`${file.name} · Tên hoặc định dạng tệp không hợp lệ.`);
          continue;
        }
        if (!file.size || file.size > maximumUploadSize) {
          failures.push(`${file.name} · Dung lượng phải từ 1 byte đến ${formatSize(maximumUploadSize)}.`);
          continue;
        }

        const step = { name: file.name, index: index + 1, total: files.length };
        setProgress({ ...step, percentage: 0 });
        try {
          const thumbnail = await createThumbnail(file, contentType.startsWith("video/")).catch(() => null);
          controller.signal.throwIfAborted();
          if (thumbnail) {
            await upload(`${folder}/thumbnail.webp`, thumbnail, { ...options, contentType: "image/webp" });
          }
          await upload(pathname, file, {
            ...options,
            contentType,
            multipart: file.size > 8 * 1024 * 1024,
            onUploadProgress: ({ percentage }) => setProgress({ ...step, percentage }),
          });
          completed++;
          if (!thumbnail) withoutThumbnail++;
        } catch {
          if (controller.signal.aborted) break;
          failures.push(`${file.name} · Tải lên thất bại.`);
        }
      }
      const cancelled = controller.signal.aborted ? " Đã dừng đợt tải lên." : "";
      const missing = withoutThumbnail ? ` ${withoutThumbnail} tệp sẽ dùng biểu tượng thay cho thumbnail.` : "";
      setMessage(`Đã tải lên ${completed}/${files.length} tệp.${cancelled}${missing}`);
      setErrors(failures);
      if (completed || controller.signal.aborted || failures.length) {
        setUploadVersion((version) => version + 1);
      }
      if (input.current) input.current.value = "";
    } finally {
      active.current = null;
      setProgress(null);
    }
  }

  return (
    <>
      <section className="mx-auto mt-5 max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-8">
        <h2 className="text-lg font-medium">Tải lên ảnh hoặc video</h2>
        <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={input}
            type="file"
            multiple
            aria-label="Chọn ảnh hoặc video"
            accept=".jpg,.jpeg,.png,.webp,.avif,.gif,.mp4,.m4v,.webm,.mov"
            disabled={progress !== null}
            required
            className="w-full min-w-0 rounded-lg border border-zinc-700 p-2 sm:w-auto"
          />
          <button disabled={progress !== null} className="rounded-lg bg-blue-600 px-4 py-2 font-medium disabled:opacity-50">
            Tải lên
          </button>
          {progress !== null && (
            <button type="button" onClick={() => active.current?.abort()} className="rounded-lg border border-zinc-700 px-4 py-2">
              Hủy
            </button>
          )}
        </form>
        <p className="mt-3 text-sm text-zinc-400">Tối đa {formatSize(maximumUploadSize)} mỗi tệp. Tệp tải lên sẽ hiển thị công khai.</p>
        {progress !== null && (
          <div className="mt-3">
            <p className="break-all text-sm text-zinc-300">Tệp {progress.index}/{progress.total} · {progress.name}</p>
            <progress aria-label="Tiến độ tải lên" className="w-full" value={progress.percentage} max={100} />
          </div>
        )}
        {message && <p role="status" className="mt-3 text-sm text-zinc-200">{message}</p>}
        {errors.length > 0 && (
          <ul role="alert" className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-300">
            {errors.map((error, index) => <li key={index} className="break-all">{error}</li>)}
          </ul>
        )}
      </section>
      <Archive initialFiles={emptyCatalog} uploadVersion={uploadVersion} management={{ github: canManageGitHub }} />
    </>
  );
}
