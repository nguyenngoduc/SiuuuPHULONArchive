import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { maximumUploadSize, parseUploadPath } from "@/lib/archive-upload";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && origin !== `https://${host}` && origin !== `http://${host}`) {
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  }
  if (!(await auth())?.user) {
    return Response.json({ error: "Bạn cần đăng nhập bằng tài khoản quản trị." }, { status: 401 });
  }

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
