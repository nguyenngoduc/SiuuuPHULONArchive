import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ArchiveFile } from "@/lib/archive";
import Archive from "./components/Archive";

export const dynamic = "force-static";

export default async function Page() {
  const directory = join(process.cwd(), "public/files");
  const entries = await readdir(directory, { withFileTypes: true });
  const thumbnails = new Set(await readdir(join(process.cwd(), "public/thumbnails")));
  const files: ArchiveFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const path = join(directory, entry.name);
    const { size } = await stat(path);
    const hash = createHash("sha1").update(`blob ${size}\0`);
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    const sha = hash.digest("hex");
    const thumbnail = `${sha}.webp`;

    files.push({
      name: entry.name,
      size,
      sha,
      url: `/files/${encodeURIComponent(entry.name)}`,
      thumbnail: thumbnails.has(thumbnail) ? `/thumbnails/${thumbnail}` : undefined,
    });
  }

  files.sort((a, b) => a.name.localeCompare(b.name));
  return <Archive initialFiles={files} />;
}
