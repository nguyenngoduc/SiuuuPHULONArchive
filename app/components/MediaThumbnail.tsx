import Image from "next/image";
import { getFileType, type ArchiveFile } from "@/lib/archive";

export function MediaThumbnail({ file }: { file: ArchiveFile }) {
  if (file.thumbnail) {
    return <Image src={file.thumbnail} alt="" unoptimized fill loading="lazy" className="object-cover" />;
  }
  return (
    <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-zinc-400 text-xs">
      {getFileType(file.name) === "video" ? "▶" : file.name.split(".").pop()?.toUpperCase()}
    </span>
  );
}
