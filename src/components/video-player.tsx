import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  SkipForward,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useVideoProgress } from "@/hooks/use-video-progress";

interface VideoPlayerProps {
  src: string;
  movieId?: string;
  tmdbId?: string;
  onBack: () => void;
  title?: string;
}

export function VideoPlayer({ src, movieId, tmdbId, onBack, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { progress, saveProgress } = useVideoProgress(movieId, tmdbId);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (progress && progress.last_position_seconds > 0 && !progress.is_finished) {
      video.currentTime = progress.last_position_seconds;
    }

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Save progress every 5 seconds
      if (Math.floor(video.currentTime) % 5 === 0) {
        saveProgress({
          lastPosition: video.currentTime,
          duration: video.duration,
          finished: video.currentTime > video.duration * 0.95,
        });
      }
    };
    const handleLoadedMetadata = () => setDuration(video.duration);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [progress, saveProgress]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleFullscreen = () => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div
      className="relative w-full h-screen bg-black group overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        autoPlay
      />

      {/* Overlays */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-500 ${showControls ? "opacity-100" : "opacity-0"}`}
      >
        {/* Top Controls */}
        <div className="absolute top-0 inset-x-0 p-8 md:p-12 flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full hover:bg-white/20 text-white size-12"
          >
            <ArrowLeft className="size-8" />
          </Button>
          <div className="flex-1">
            <h2 className="font-display text-3xl md:text-5xl text-white text-shadow-strong uppercase italic tracking-tighter">
              {title}
            </h2>
          </div>
        </div>

        {/* Center Play/Pause */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!playing && (
            <div className="bg-primary/20 backdrop-blur-md rounded-full p-12 animate-in fade-in zoom-in duration-300">
              <Play className="size-24 fill-current text-white" />
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 inset-x-0 p-8 md:p-12 pt-20">
          {/* Progress Bar */}
          <div className="mb-6 group/progress">
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleSeek}
              className="cursor-pointer h-1 hover:h-2 transition-all"
            />
            <div className="flex justify-between mt-3 text-sm font-mono text-white/70">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <button
                onClick={togglePlay}
                className="text-white hover:text-primary transition-all hover:scale-125"
              >
                {playing ? (
                  <Pause className="size-10 fill-current" />
                ) : (
                  <Play className="size-10 fill-current" />
                )}
              </button>
              <button
                onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)}
                className="text-white hover:text-primary transition-all hover:scale-125"
              >
                <RotateCcw className="size-8" />
              </button>
              <button
                onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}
                className="text-white hover:text-primary transition-all hover:scale-125"
              >
                <SkipForward className="size-8" />
              </button>
              <div className="flex items-center gap-4 group/volume">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-primary transition-colors"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="size-8" />
                  ) : (
                    <Volume2 className="size-8" />
                  )}
                </button>
                <div className="w-0 group-hover/volume:w-32 transition-all overflow-hidden duration-500">
                  <Slider
                    value={[muted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={(v) => {
                      if (videoRef.current) videoRef.current.volume = v[0];
                      setVolume(v[0]);
                      setMuted(v[0] === 0);
                    }}
                    className="w-28"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <button className="text-white hover:text-primary transition-all hover:rotate-90 duration-500">
                <Settings className="size-8" />
              </button>
              <button
                onClick={handleFullscreen}
                className="text-white hover:text-primary transition-all hover:scale-125"
              >
                <Maximize className="size-8" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
