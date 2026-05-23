"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";

export default function VideoPlayer({
  fileName,
  src,
}: {
  fileName: string;
  src: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const player = videojs(videoRef.current, {
      autoplay: false,
      controls: true,
      fluid: true,
      preload: "auto",
      responsive: true,
      sources: [{ src, type: "video/mp4" }],
    });

    playerRef.current = player;

    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="video-js vjs-big-play-centered"
      playsInline
      title={fileName}
    />
  );
}
