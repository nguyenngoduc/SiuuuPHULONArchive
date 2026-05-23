import Link from "next/link";
import VideoPlayer from "./VideoPlayer";

function isVideoFile(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ["mp4", "mov", "avi", "mkv", "webm", "m4v"].includes(ext);
}

export default async function VideoPage({
  searchParams,
}: {
  searchParams: Promise<{ file?: string | string[] }>;
}) {
  const params = await searchParams;
  const fileName = Array.isArray(params.file) ? params.file[0] : params.file;

  if (!fileName || !isVideoFile(fileName)) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold">Không tìm thấy video</h1>
          <p className="mt-3 text-zinc-400">
            File video không hợp lệ hoặc chưa được truyền vào trình xem.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Quay lại
          </Link>
        </div>
      </main>
    );
  }

  const src = `/files/${encodeURIComponent(fileName)}`;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="min-w-0 truncate text-base font-semibold sm:text-xl">
            {fileName}
          </h1>
          <div className="flex shrink-0 gap-2">
            <a
              href={src}
              download={fileName}
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-500"
            >
              Download
            </a>
            <Link
              href="/"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
            >
              Quay lại
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full overflow-hidden rounded-lg bg-zinc-950">
            <VideoPlayer fileName={fileName} src={src} />
          </div>
        </div>
      </div>
    </main>
  );
}
