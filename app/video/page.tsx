"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

export default function VideoPlayer() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const fileName = searchParams.get("file") || "";

  const videoUrl = `https://raw.githubusercontent.com/nguyenngoduc/SiuuuPHULONArchive/main/public/files/${encodeURIComponent(fileName)}`;

  useEffect(() => {
    if (!videoRef.current) return;

    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: "auto",
      fluid: true,
      responsive: true,
    });

    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white truncate">{fileName}</h1>
          <a
            href="/"
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            ← Back
          </a>
        </div>

        <div className="bg-zinc-900 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-auto"
            src={videoUrl}
            controls
          />
        </div>

        <div className="mt-6 text-zinc-400 text-sm">
          <p>Video: {fileName}</p>
          <a
            href={videoUrl}
            download={fileName}
            className="mt-4 inline-block px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-all"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
