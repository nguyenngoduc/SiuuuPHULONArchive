import { useEffect, useState } from "react";
import { getVideoThumbnail } from "@/lib/videoThumbnailCache";

/**
 * Hook để trích và quản lý video thumbnail
 * @param videoUrl - URL của file video
 * @param enabled - Có nên trích thumbnail hay không (mặc định: true)
 * @returns thumbnail data URL hoặc null
 */
export function useVideoThumbnail(
  videoUrl: string,
  enabled: boolean = true
): string | null {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !videoUrl) {
      return;
    }

    getVideoThumbnail(videoUrl, (thumb) => {
      setThumbnail(thumb);
    }).catch((error) => {
      console.warn("useVideoThumbnail error:", error);
    });
  }, [videoUrl, enabled]);

  return thumbnail;
}
