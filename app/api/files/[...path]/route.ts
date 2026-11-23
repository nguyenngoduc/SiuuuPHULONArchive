import { NextResponse } from "next/server";

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
  const requestHeaders = new Headers();
  const range = request.headers.get("range");

  if (range) requestHeaders.set("range", range);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: requestHeaders,
      cache: "no-store",
    });
    const responseHeaders = new Headers({
      "cache-control": "no-store",
      "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "accept-ranges": upstream.headers.get("accept-ranges") ?? "bytes",
    });

    for (const header of ["content-length", "content-range", "etag", "last-modified"]) {
      const value = upstream.headers.get(header);
      if (value) responseHeaders.set(header, value);
    }

    if (!upstream.ok) {
      return new NextResponse(upstream.status === 404 ? "File not found" : "Unable to fetch file", {
        status: upstream.status === 404 ? 404 : 502,
        headers: { "cache-control": "no-store" },
      });
    }

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new NextResponse("Unable to fetch file", {
      status: 502,
      headers: { "cache-control": "no-store" },
    });
  }
}

export const GET = proxyFile;
export const HEAD = proxyFile;
