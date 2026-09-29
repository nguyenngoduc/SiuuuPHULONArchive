// Cache để lưu thumbnail video đã trích, tránh xử lý lại
const thumbnailCache = new Map<string, string>();

/**
 * Lấy thumbnail từ cache hoặc trích mới
 * @param videoUrl - URL của file video
 * @param onThumbnail - Callback khi thumbnail sẵn sàng
 */
export async function getVideoThumbnail(
  videoUrl: string,
  onThumbnail: (thumbnail: string) => void
): Promise<void> {
  // Kiểm tra cache trước
  if (thumbnailCache.has(videoUrl)) {
    onThumbnail(thumbnailCache.get(videoUrl)!);
    return;
  }

  // Trích thumbnail mới
  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.crossOrigin = "anonymous";
  video.style.display = "none";

  const handleLoadedMetadata = () => {
    try {
      if (Number.isFinite(video.duration) && video.duration > 1) {
        video.currentTime = 1;
      }
    } catch (error) {
      console.warn("Lỗi khi seek video:", error);
      cleanup();
    }
  };

  const handleSeeked = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 72;
      canvas.height = 72;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        return;
      }

      ctx.drawImage(video, 0, 0, 72, 72);
      const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
      
      // Lưu vào cache
      thumbnailCache.set(videoUrl, thumbnail);
      onThumbnail(thumbnail);
      cleanup();
    } catch (error) {
      console.warn("Lỗi khi trích thumbnail:", error);
      cleanup();
    }
  };

  const handleError = () => {
    console.warn("Lỗi khi load video:", videoUrl);
    cleanup();
  };

  const cleanup = () => {
    video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    video.removeEventListener("seeked", handleSeeked);
    video.removeEventListener("error", handleError);
    if (video.parentNode) {
      video.parentNode.removeChild(video);
    }
  };

  video.addEventListener("loadedmetadata", handleLoadedMetadata);
  video.addEventListener("seeked", handleSeeked);
  video.addEventListener("error", handleError);
  document.body.appendChild(video);
}

/**
 * Xóa cache thumbnail (dùng khi cần làm sạch memory)
 */
export function clearThumbnailCache(): void {
  thumbnailCache.clear();
}

/**
 * Lấy số lượng thumbnail trong cache
 */
export function getThumbnailCacheSize(): number {
  return thumbnailCache.size;
}
