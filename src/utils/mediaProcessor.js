import { spawn } from "node:child_process";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const ffmpegPath = () => process.env.FFMPEG_PATH || "ffmpeg";

async function runFfmpeg(buffer, args, inputExt, outputExt) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mellow-md-"));
  const inputPath = path.join(tempDir, `input.${inputExt}`);
  const outputPath = path.join(tempDir, `output.${outputExt}`);

  try {
    await writeFile(inputPath, buffer);
    await new Promise((resolve, reject) => {
      const child = spawn(ffmpegPath(), ["-y", "-i", inputPath, ...args, outputPath]);
      let stderr = "";

      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => {
        stderr = `${stderr}${chunk}`.slice(-8192);
      });
      child.once("error", reject);
      child.once("close", (code) => {
        if (code === 0) {
          resolve(undefined);
        } else {
          reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`));
        }
      });
    });
    return await readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function addStickerMetadata(webp, pack, author) {
  if (webp.toString("ascii", 0, 4) !== "RIFF" || webp.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("FFmpeg did not produce a valid WebP sticker");
  }

  const json = Buffer.from(
    JSON.stringify({
      "sticker-pack-id": "mellow-md",
      "sticker-pack-name": pack,
      "sticker-pack-publisher": author,
      emojis: [],
    }),
  );
  const tiff = Buffer.alloc(26);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x5741, 10);
  tiff.writeUInt16LE(7, 12);
  tiff.writeUInt32LE(json.length, 14);
  tiff.writeUInt32LE(26, 18);
  const exif = Buffer.concat([tiff, json]);

  const chunks = [];
  let hasExtendedHeader = false;
  let imageWidth;
  let imageHeight;
  for (let offset = 12; offset + 8 <= webp.length;) {
    const type = webp.toString("ascii", offset, offset + 4);
    const size = webp.readUInt32LE(offset + 4);
    const end = offset + 8 + size;
    if (end > webp.length) throw new Error("FFmpeg produced a malformed WebP chunk");
    const chunk = Buffer.from(webp.subarray(offset, end + (size & 1)));

    if (type === "VP8X") {
      hasExtendedHeader = true;
      chunk[8] = (chunk[8] ?? 0) | 0x08;
      imageWidth = chunk.readUIntLE(12, 3) + 1;
      imageHeight = chunk.readUIntLE(15, 3) + 1;
    } else if (type === "VP8L") {
      const data = webp.subarray(offset + 8, end);
      if (data[0] === 0x2f && data.length >= 5) {
        imageWidth = 1 + data[1] + ((data[2] & 0x3f) << 8);
        imageHeight = 1 + (data[2] >> 6) + (data[3] << 2) + ((data[4] & 0x0f) << 10);
      }
    } else if (type === "VP8 ") {
      const data = webp.subarray(offset + 8, end);
      if (data.length >= 10 && data[3] === 0x9d && data[4] === 0x01 && data[5] === 0x2a) {
        imageWidth = data.readUInt16LE(6) & 0x3fff;
        imageHeight = data.readUInt16LE(8) & 0x3fff;
      }
    }

    chunks.push(chunk);
    offset = end + (size & 1);
  }

  if (!hasExtendedHeader) {
    if (!imageWidth || !imageHeight) throw new Error("Unable to read WebP sticker dimensions");
    const extendedHeader = Buffer.alloc(18);
    extendedHeader.write("VP8X", 0, "ascii");
    extendedHeader.writeUInt32LE(10, 4);
    extendedHeader[8] = 0x08;
    extendedHeader.writeUIntLE(imageWidth - 1, 12, 3);
    extendedHeader.writeUIntLE(imageHeight - 1, 15, 3);
    chunks.unshift(extendedHeader);
  }

  const exifChunk = Buffer.alloc(8 + exif.length + (exif.length & 1));
  exifChunk.write("EXIF", 0, "ascii");
  exifChunk.writeUInt32LE(exif.length, 4);
  exif.copy(exifChunk, 8);
  chunks.push(exifChunk);

  const body = Buffer.concat([Buffer.from("WEBP"), ...chunks]);
  const riffHeader = Buffer.alloc(8);
  riffHeader.write("RIFF", 0, "ascii");
  riffHeader.writeUInt32LE(body.length, 4);
  return Buffer.concat([riffHeader, body]);
}

/**
 * Converts a media buffer to a WhatsApp-compatible WebP sticker.
 * @param {Buffer} buffer
 * @param {string} ext
 * @param {{ pack: string, author: string, animated?: boolean }} metadata
 * @returns {Promise<Buffer>}
 */
async function toSticker(buffer, ext, { pack, author, animated = false }) {
  const filters = [
    "scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos",
    "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
  ];
  if (animated) filters.push("fps=15");
  const webp = await runFfmpeg(
    buffer,
    [
      "-vf",
      filters.join(","),
      ...(animated ? ["-loop", "0"] : ["-frames:v", "1"]),
      "-an",
      "-c:v",
      animated ? "libwebp_anim" : "libwebp",
      "-lossless",
      "0",
      "-q:v",
      "60",
      "-f",
      "webp",
    ],
    ext,
    "webp",
  );
  return addStickerMetadata(webp, pack, author);
}

function toAudio(buffer, ext) {
  return runFfmpeg(buffer, ["-vn", "-ac", "2", "-b:a", "128k", "-ar", "44100", "-f", "mp3"], ext, "mp3");
}

function reverseAudio(buffer, ext) {
  return runFfmpeg(buffer, ["-af", "areverse", "-f", "mp3"], ext, "mp3");
}

function reverseVideo(buffer, ext) {
  return runFfmpeg(buffer, ["-vf", "reverse", "-af", "areverse", "-f", "mp4"], ext, "mp4");
}

function toVideo(buffer, ext) {
  return runFfmpeg(
    buffer,
    [
      "-vf",
      "scale=512:512:force_original_aspect_ratio=decrease",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "28",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-movflags",
      "+faststart",
      "-f",
      "mp4",
    ],
    ext,
    "mp4",
  );
}

async function getDurationFromFile(buffer) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mellow-md-"));
  const filePath = path.join(tempDir, "input.mp4");

  try {
    await writeFile(filePath, buffer);
    const ffprobePath =
      process.env.FFPROBE_PATH ||
      (process.env.FFMPEG_PATH?.includes(path.sep)
        ? path.join(path.dirname(process.env.FFMPEG_PATH), "ffprobe")
        : "ffprobe");
    const { stdout } = await execFile(ffprobePath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const duration = Number.parseFloat(stdout.trim());
    if (!Number.isFinite(duration)) throw new Error("ffprobe returned an invalid media duration");
    return duration;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function trimVideo(buffer, ext, start, duration) {
  return runFfmpeg(
    buffer,
    [
      "-ss",
      start.toString(),
      "-t",
      duration.toString(),
      "-an",
      "-sn",
      "-dn",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "30",
      "-tune",
      "fastdecode",
      "-vf",
      "scale=512:512:force_original_aspect_ratio=decrease,fps=15",
      "-pix_fmt",
      "yuv420p",
      "-f",
      "mp4",
    ],
    ext,
    "mp4",
  );
}

export { toAudio, getDurationFromFile, reverseAudio, reverseVideo, toVideo, trimVideo, toSticker };
