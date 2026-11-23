import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { verifyAdminRequest } from "@/auth";
import { maximumUploadSize, parseUploadPath } from "@/lib/archive-upload";

export async function POST(request: Request) {
  const denied = await verifyAdminRequest(request);
  if (denied) return denied;

  try {
    const body: HandleUploadBody = await request.json();
    if (body.type !== "blob.generate-client-token" || typeof body.payload?.pathname !== "string") {
      return Response.json({ error: "Yêu cầu tải lên không hợp lệ." }, { status: 400 });
    }
    const file = parseUploadPath(body.payload.pathname);
    if (!file) {
      return Response.json({ error: "Tên hoặc định dạng tệp không được hỗ trợ." }, { status: 400 });
    }
    return Response.json(await handleUpload({
      body,
      request,
      async onBeforeGenerateToken() {
        return {
          allowedContentTypes: [file.contentType],
          maximumSizeInBytes: file.name ? maximumUploadSize : 512 * 1024,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    }));
  } catch {
    return Response.json({ error: "Không thể cấp quyền tải lên Blob." }, { status: 400 });
  }
}
