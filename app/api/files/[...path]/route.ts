import { NextResponse } from "next/server";
import { extname } from "node:path";

const mediaTypes: Readonly<Record<string, string>> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyFile(request: Request, { params }: RouteContext) {
  const { path } = await params;

  if (
    path.length === 0 ||
    path.some((segment) => segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))
  ) {
    return new NextResponse("File not found", { status: 404 });
  }

  const filePath = path.map(encodeURIComponent).join("/");
  const upstreamUrl = `https://raw.githubusercontent.com/nguyenngoduc/SiuuuPHULONArchive/main/public/files/${filePath}`;
  const requestHeaders = new Headers({ "accept-encoding": "identity" });
  for (const header of ["range", "if-range"]) {
    const value = request.headers.get(header);
    if (value) requestHeaders.set(header, value);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: requestHeaders,
      cache: "no-store",
    });
    const responseHeaders = new Headers({
      "cache-control": "no-store",
      "accept-ranges": upstream.headers.get("accept-ranges") ?? "bytes",
    });

    if (upstream.status === 416) {
      const contentRange = upstream.headers.get("content-range");
      if (contentRange) responseHeaders.set("content-range", contentRange);
      void upstream.body?.cancel().catch(() => undefined);
      return new Response(null, { status: 416, headers: responseHeaders });
    }

    if (!upstream.ok) {
      void upstream.body?.cancel().catch(() => undefined);
      return new NextResponse(
        request.method === "HEAD" ? null : upstream.status === 404 ? "File not found" : "Unable to fetch file",
        { status: upstream.status === 404 ? 404 : 502, headers: responseHeaders },
      );
    }

    const extension = extname(path[path.length - 1]).toLowerCase();
    responseHeaders.set(
      "content-type",
      mediaTypes[extension] ?? upstream.headers.get("content-type") ?? "application/octet-stream",
    );

    for (const header of ["content-length", "content-range", "etag", "last-modified"]) {
      const value = upstream.headers.get(header);
      if (value) responseHeaders.set(header, value);
    }

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new NextResponse(request.method === "HEAD" ? null : "Unable to fetch file", {
      status: 502,
      headers: { "cache-control": "no-store" },
    });
  }
}

export const GET = proxyFile;
export const HEAD = proxyFile;
