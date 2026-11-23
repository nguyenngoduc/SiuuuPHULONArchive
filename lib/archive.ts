export type ArchiveFile = {
  name: string;
  size: number;
  sha: string;
  url: string;
  downloadUrl?: string;
  thumbnail?: string;
  date?: string;
  blobPath?: string;
};

export type ArchiveSort = "date-desc" | "date-asc" | "size-desc" | "size-asc" | "name-asc" | "name-desc";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Bangkok",
});
const nameCollator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });

export function formatArchiveDate(date?: string) {
  return date ? dateFormatter.format(new Date(date)) : "Chưa rõ ngày";
}

export function sortArchive(files: ArchiveFile[], order: ArchiveSort) {
  return [...files].sort((a, b) => {
    const byName = nameCollator.compare(a.name, b.name);
    if (order === "name-asc") return byName;
    if (order === "name-desc") return -byName;
    if (order === "size-desc") return b.size - a.size || byName;
    if (order === "size-asc") return a.size - b.size || byName;
    if (!a.date || !b.date) return Number(Boolean(b.date)) - Number(Boolean(a.date)) || byName;
    const byDate = Date.parse(a.date) - Date.parse(b.date);
    return (order === "date-desc" ? -byDate : byDate) || byName;
  });
}

export const archiveRepository = "nguyenngoduc/SiuuuPHULONArchive";
export const gitShaPattern = /^[a-f0-9]{40}$/;

export function getFileType(name: string) {
  if (/\.(jpe?g|png|gif|webp|avif)$/i.test(name)) return "image";
  if (/\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(name)) return "video";
  return "other";
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
