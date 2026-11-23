import { archiveRepository, gitShaPattern, type ArchiveFile } from "@/lib/archive";

const api = `https://api.github.com/repos/${archiveRepository}`;

async function github(path: string, immutable = false) {
  const response = await fetch(`${api}/${path}`, {
    cache: immutable ? "force-cache" : "no-store",
    signal: AbortSignal.timeout(5000),
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json();
}

export async function GET() {
  try {
    const { object } = await github("git/ref/heads/main");
    const revision: string = object?.sha;
    if (!gitShaPattern.test(revision)) throw new Error("Invalid GitHub revision");

    const commit = await github(`git/commits/${revision}`, true);
    const treeSha: string = commit.tree?.sha;
    if (!gitShaPattern.test(treeSha)) throw new Error("Invalid GitHub tree");

    const snapshot: {
      truncated: boolean;
      tree: { path: string; type: string; sha: string; size: number }[];
    } = await github(`git/trees/${treeSha}?recursive=1`, true);
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
        url: `/api/files/${encodeURIComponent(name)}?rev=${revision}`,
        thumbnail: paths.has(thumbnail)
          ? `https://raw.githubusercontent.com/${archiveRepository}/${revision}/${thumbnail}`
          : undefined,
      }];
    });

    files.sort((a, b) => a.name.localeCompare(b.name));
    return Response.json(files, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } });
  } catch {
    return Response.json({ error: "Không thể đồng bộ GitHub." }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
