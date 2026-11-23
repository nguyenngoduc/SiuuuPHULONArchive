import { BlobNotFoundError, BlobPreconditionFailedError, del, head, rename } from "@vercel/blob";
import { verifyAdminRequest } from "@/auth";
import { gitShaPattern } from "@/lib/archive";
import { parseUploadPath } from "@/lib/archive-upload";
import { getArchiveRevision, GitHubArchiveError, githubArchive } from "@/lib/github-archive";

function validFileName(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 180
    && value !== "." && value !== ".." && !/[\/\\\u0000-\u001f\u007f]/u.test(value);
}

async function changeGitHubFile(name: string, sha: string, newName: string | undefined, token: string) {
  const { revision, treeSha } = await getArchiveRevision(token);
  const { tree, truncated } = await githubArchive<{
    truncated: boolean;
    tree: { path: string; mode: string; type: string; sha: string }[];
  }>(`git/trees/${treeSha}?recursive=1`, { token });
  if (truncated) throw new Error("GitHub tree was truncated");

  const path = `public/files/${name}`;
  const file = tree.find((entry) => entry.path === path && entry.type === "blob" && /^100[0-7]{3}$/.test(entry.mode));
  if (!file || file.sha !== sha) throw new GitHubArchiveError(409);
  const changes: { path: string; type: string; mode: string; sha: string | null }[] = [
    { path, type: "blob", mode: file.mode, sha: null },
  ];
  if (newName) {
    const destination = `public/files/${newName}`;
    if (tree.some((entry) => entry.path === destination)) throw new GitHubArchiveError(409);
    changes.push({ path: destination, type: "blob", mode: file.mode, sha });
  }

  const nextTree = await githubArchive<{ sha: string }>("git/trees", {
    token, method: "POST", body: { base_tree: treeSha, tree: changes },
  });
  const commit = await githubArchive<{ sha: string }>("git/commits", {
    token,
    method: "POST",
    body: {
      tree: nextTree.sha,
      parents: [revision],
      message: newName ? `Rename archive file: ${name} → ${newName}` : `Delete archive file: ${name}`,
    },
  });
  await githubArchive("git/refs/heads/main", {
    token, method: "PATCH", body: { sha: commit.sha, force: false },
  });
}

export async function POST(request: Request) {
  const denied = await verifyAdminRequest(request);
  if (denied) return denied;
  const input = await request.json().catch(() => null);
  const { action, source, name, sha, blobPath } = input ?? {};
  const newName = typeof input?.newName === "string" ? input.newName.trim() : undefined;
  if ((action !== "rename" && action !== "delete") || !validFileName(name)
    || (action === "rename" && (!validFileName(newName) || newName === name))
    || (action === "delete" && newName !== undefined)) {
    return Response.json({ error: "Yêu cầu hoặc tên tệp không hợp lệ." }, { status: 400 });
  }
  if (newName && (name.match(/\.[^.]+$/)?.[0].toLowerCase() ?? "") !== (newName.match(/\.[^.]+$/)?.[0].toLowerCase() ?? "")) {
    return Response.json({ error: "Giữ nguyên phần mở rộng của tệp khi đổi tên." }, { status: 400 });
  }

  try {
    if (source === "blob") {
      const file = typeof blobPath === "string" && parseUploadPath(blobPath);
      if (!file || file.name !== name) {
        return Response.json({ error: "Đường dẫn tệp không hợp lệ." }, { status: 400 });
      }
      const current = await head(blobPath);
      if (newName) {
        const destination = `archive/${file.id}/original/${newName}`;
        await rename(current.url, destination, {
          access: "public", addRandomSuffix: false, allowOverwrite: false, contentType: file.contentType,
        });
      } else {
        await del(current.url, { ifMatch: current.etag });
        await del(`archive/${file.id}/thumbnail.webp`).catch(() => {
          console.warn("Could not remove archive thumbnail after deleting original", file.id);
        });
      }
    } else if (source === "github" && typeof sha === "string" && gitShaPattern.test(sha)) {
      const token = process.env.ARCHIVE_GITHUB_TOKEN;
      if (!token) {
        return Response.json({ error: "Chưa cấu hình quyền sửa tệp GitHub." }, { status: 403 });
      }
      await changeGitHubFile(name, sha, newName, token);
    } else {
      return Response.json({ error: "Nguồn tệp không hợp lệ." }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof BlobNotFoundError || error instanceof BlobPreconditionFailedError
      || (error instanceof GitHubArchiveError && [409, 422].includes(error.status))) {
      return Response.json({ error: "Tệp đã thay đổi hoặc tên mới đã tồn tại. Hãy tải lại danh sách." }, { status: 409 });
    }
    if (error instanceof GitHubArchiveError && [401, 403, 404].includes(error.status)) {
      return Response.json({ error: "GitHub từ chối truy cập. Kiểm tra quyền của token và nhánh main." }, { status: 502 });
    }
    return Response.json({ error: "Không thể cập nhật tệp. Hãy kiểm tra lại danh sách trước khi thử lại." }, { status: 502 });
  }
}
