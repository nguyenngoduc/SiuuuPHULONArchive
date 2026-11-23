export type ArchiveFile = {
  name: string;
  size: number;
  sha: string;
  url: string;
  downloadUrl?: string;
  thumbnail?: string;
};

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
