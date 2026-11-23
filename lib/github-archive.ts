import dates from "./archive-dates.json";
import { archiveRepository, gitShaPattern } from "./archive";

const api = `https://api.github.com/repos/${archiveRepository}`;
const knownDates: Record<string, { sha: string; date: string }> = dates;

export function bundledArchiveDate(name: string, sha: string) {
  const entry = knownDates[name];
  return entry?.sha === sha ? entry.date : undefined;
}

export class GitHubArchiveError extends Error {
  constructor(readonly status: number) {
    super(`GitHub API returned ${status}`);
  }
}

export async function githubArchive<T>(path: string, {
  immutable = false,
  token,
  method = "GET",
  body,
}: {
  immutable?: boolean;
  token?: string;
  method?: "GET" | "POST" | "PATCH";
  body?: object;
} = {}): Promise<T> {
  const response = await fetch(`${api}/${path}`, {
    method,
    cache: immutable ? "force-cache" : "no-store",
    signal: AbortSignal.timeout(5000),
    headers: {
      Accept: "application/vnd.github+json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && { "Content-Type": "application/json" }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new GitHubArchiveError(response.status);
  return response.json();
}

export async function getArchiveRevision(token?: string) {
  const { object } = await githubArchive<{ object: { sha: string } }>("git/ref/heads/main", { token });
  if (!gitShaPattern.test(object.sha)) throw new Error("Invalid GitHub revision");
  const { tree } = await githubArchive<{ tree: { sha: string } }>(`git/commits/${object.sha}`, {
    token, immutable: !token,
  });
  if (!gitShaPattern.test(tree.sha)) throw new Error("Invalid GitHub tree");
  return { revision: object.sha, treeSha: tree.sha };
}
