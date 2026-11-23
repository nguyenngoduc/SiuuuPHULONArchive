import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readdir, rename, stat, rm } from "node:fs/promises";
import { resolve } from "node:path";

const files = resolve("public/files");
const thumbnails = resolve("public/thumbnails");
await mkdir(thumbnails, { recursive: true });

for (const entry of await readdir(files, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.(avif|gif|jpe?g|png|webp|mp4|m4v|mov|webm|avi|mkv)$/i.test(entry.name)) continue;
  const input = resolve(files, entry.name);
  const { size } = await stat(input);
  const hash = createHash("sha1").update(`blob ${size}\0`);
  for await (const chunk of createReadStream(input)) hash.update(chunk);
  const output = resolve(thumbnails, `${hash.digest("hex")}.webp`);
  if (await access(output).then(() => true, () => false)) continue;

  const temporary = `${output}.tmp.webp`;
  const { status, error } = spawnSync("ffmpeg", [
    "-nostdin", "-v", "error", "-y", "-threads", "1", "-i", input,
    "-map", "0:v:0", "-frames:v", "1", "-vf",
    "scale=240:240:force_original_aspect_ratio=decrease", "-c:v", "libwebp",
    "-quality", "70", "-threads", "1", temporary,
  ], { stdio: "inherit" });
  if (status !== 0) {
    await rm(temporary, { force: true });
    throw error ?? new Error(`Không thể tạo thumbnail cho ${entry.name}`);
  }
  await rename(temporary, output);
}
