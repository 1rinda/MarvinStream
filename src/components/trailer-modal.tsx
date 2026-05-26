"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function toYouTubeEmbedUrl(url: string) {
  if (!url) return url;
  // Accept watch URL or embed URL or just key
  const m =
    url.match(/[?&]v=([\w-]+)/) || url.match(/youtu\.be\/([\w-]+)/) || url.match(/embed\/([\w-]+)/);
  const key = m ? m[1] : url;
  return `https://www.youtube.com/embed/${key}?autoplay=1&muted=1&rel=0`;
}

export function TrailerModal({
  open,
  onOpenChange,
  trailerUrl,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trailerUrl?: string | null;
  title?: string;
}) {
  const embedSrc = trailerUrl ? toYouTubeEmbedUrl(trailerUrl) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95%] p-0 bg-black">
        <div className="relative pb-[56.25%]">
          {/* 16:9 container */}
          {embedSrc ? (
            <iframe
              src={embedSrc}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title={title ?? "Trailer"}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white p-6">
              No trailer available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
