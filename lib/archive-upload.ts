export const uploadPrefix = "archive/";
export const maximumUploadSize = 512 * 1024 * 1024;

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export function uploadContentType(name: string) {
  const extension = name.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase();
  return extension && Object.hasOwn(contentTypes, extension) ? contentTypes[extension] : undefined;
}

export function parseUploadPath(pathname: string) {
  const match = /^archive\/([a-f0-9-]{36})\/(thumbnail\.webp|original\/([^/\\]+))$/u.exec(pathname);
  if (!match) return;
  const name = match[3];
  if (name && (name.length > 180 || /[\u0000-\u001f\u007f]/u.test(name))) return;
  const contentType = name ? uploadContentType(name) : "image/webp";
  if (contentType) return { id: match[1], name, contentType };
}
