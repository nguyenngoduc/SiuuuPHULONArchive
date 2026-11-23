import { getDownloadUrl, list, type ListBlobResultBlob } from "@vercel/blob";
import type { ArchiveFile } from "@/lib/archive";
import { parseUploadPath, uploadPrefix } from "@/lib/archive-upload";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json([]);

  try {
    const files: ArchiveFile[] = [];
    const thumbnails = new Map<string, string>();
    let cursor: string | undefined;

    do {
      const result: { blobs: ListBlobResultBlob[]; cursor?: string } = await list({
        prefix: uploadPrefix,
        cursor,
      });
      for (const blob of result.blobs) {
        const entry = parseUploadPath(blob.pathname);
        if (!entry) continue;
        if (entry.name) {
          files.push({
            name: entry.name,
            sha: entry.id,
            size: blob.size,
            url: blob.url,
            downloadUrl: getDownloadUrl(blob.url),
          });
        } else {
          thumbnails.set(entry.id, blob.url);
        }
      }
      cursor = result.cursor;
    } while (cursor);

    for (const file of files) file.thumbnail = thumbnails.get(file.sha);
    return Response.json(files, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Không thể tải danh sách từ Blob." }, { status: 502 });
  }
}
