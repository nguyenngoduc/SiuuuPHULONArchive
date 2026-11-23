import { archiveRepository, type ArchiveFile } from "@/lib/archive";
import { bundledArchiveDate, getArchiveRevision, githubArchive } from "@/lib/github-archive";

export async function GET() {
  try {
    const { revision, treeSha } = await getArchiveRevision();
    const snapshot = await githubArchive<{
      truncated: boolean;
      tree: { path: string; type: string; sha: string; size: number }[];
    }>(`git/trees/${treeSha}?recursive=1`, { immutable: true });
    if (snapshot.truncated) throw new Error("GitHub tree was truncated");

    const paths = new Set(snapshot.tree.filter((entry) => entry.type === "blob").map((entry) => entry.path));
    const files: ArchiveFile[] = snapshot.tree.flatMap((entry) => {
      if (entry.type !== "blob" || !entry.path.startsWith("public/files/")) return [];
      const name = entry.path.slice("public/files/".length);
      if (!name || name.includes("/")) return [];
      const thumbnail = `public/thumbnails/${entry.sha}.webp`;
      return [{
        name,
        size: entry.size,
        sha: entry.sha,
        date: bundledArchiveDate(name, entry.sha),
        url: `/api/files/${encodeURIComponent(name)}?rev=${revision}`,
        thumbnail: paths.has(thumbnail)
          ? `https://raw.githubusercontent.com/${archiveRepository}/${revision}/${thumbnail}`
          : undefined,
      }];
    });

    // Bound requests on the public API if a large import bypasses the bundled index.
    const missingDates = files.filter((file) => !file.date).slice(0, 12);
    await Promise.allSettled(missingDates.map(async (file) => {
      const query = new URLSearchParams({ path: `public/files/${file.name}`, sha: revision, per_page: "1" });
      const history = await githubArchive<{ commit: { committer: { date: string } } }[]>(
        `commits?${query}`, { immutable: true },
      );
      const date = history[0]?.commit.committer.date;
      if (date && Number.isFinite(Date.parse(date))) file.date = date;
    }));

    files.sort((a, b) => a.name.localeCompare(b.name));
    return Response.json(files, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } });
  } catch {
    return Response.json({ error: "Không thể đồng bộ GitHub." }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
