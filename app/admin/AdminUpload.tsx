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

export function AdminUpload() {
  const input = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadVersion, setUploadVersion] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    const file = input.current?.files?.[0];
    const contentType = file && uploadContentType(file.name);
    setMessage("");
    setError("");
    if (!file || !contentType) {
      setError("Chọn ảnh hoặc video có định dạng được hỗ trợ.");
      return;
    }
    if (!file.size || file.size > maximumUploadSize) {
      setError(`Tệp phải có kích thước từ 1 byte đến ${formatSize(maximumUploadSize)}.`);
      return;
    }

    const folder = `archive/${crypto.randomUUID()}`;
    const pathname = `${folder}/original/${file.name}`;
    if (!parseUploadPath(pathname)) {
      setError("Tên tệp không hợp lệ hoặc dài hơn 180 ký tự.");
      return;
    }

    const controller = new AbortController();
    active.current = controller;
    setProgress(0);
    const options = {
      access: "public" as const,
      handleUploadUrl: "/api/admin/upload",
      abortSignal: controller.signal,
    };

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
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });
      setMessage(thumbnail
        ? `Đã tải lên ${file.name}.`
        : `Đã tải lên ${file.name}. Danh sách sẽ dùng biểu tượng vì thiết bị không tạo được thumbnail.`);
      setUploadVersion((version) => version + 1);
      if (input.current) input.current.value = "";
    } catch {
      if (controller.signal.aborted) setMessage("Đã hủy tải lên.");
      else setError("Tải lên thất bại. Kiểm tra kết nối hoặc đăng nhập lại rồi thử lại.");
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
        {progress !== null && <progress aria-label="Tiến độ tải lên" className="mt-3 w-full" value={progress} max={100} />}
        {message && <p role="status" className="mt-3 text-sm text-zinc-200">{message}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      </section>
      <Archive initialFiles={emptyCatalog} uploadVersion={uploadVersion} />
    </>
  );
}
