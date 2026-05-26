import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(onLog?: (msg: string) => void) {
  if (ffmpegInstance) return ffmpegInstance;
  const ffmpeg = new FFmpeg();
  if (onLog) ffmpeg.on("log", ({ message }) => onLog(message));
  // Multi-thread build via CDN
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

export type CompressOptions = {
  /** target maximum height (default 720) */
  maxHeight?: number;
  /** CRF for x264, lower = better quality, higher = smaller. 28 ≈ web. */
  crf?: number;
  /** preset speed/quality tradeoff */
  preset?: "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium";
  onProgress?: (ratio: number) => void;
  onLog?: (msg: string) => void;
};

export async function compressVideo(file: File, opts: CompressOptions = {}): Promise<File> {
  const { maxHeight = 720, crf = 28, preset = "veryfast", onProgress, onLog } = opts;
  const ffmpeg = await getFFmpeg(onLog);

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => onProgress(Math.min(1, Math.max(0, progress))));
  }

  const inputName = "input." + (file.name.split(".").pop() || "mp4");
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // scale: keep aspect, cap height; ensure even dims
  const vf = `scale=-2:'min(${maxHeight},ih)'`;

  await ffmpeg.exec([
    "-i",
    inputName,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    String(crf),
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  // cleanup
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    /* noop */
  }

  const blob = new Blob([data as BlobPart], { type: "video/mp4" });
  const newName = file.name.replace(/\.[^.]+$/, "") + `_${maxHeight}p.mp4`;
  return new File([blob], newName, { type: "video/mp4" });
}

export function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
