import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import { logger } from "./log";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB pre-resize
const AVATAR_DIR = path.join(process.cwd(), "public", "avatars");
const SIZE = 256;

export async function saveAvatar(
  userId: string,
  file: File,
): Promise<string | { error: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Only PNG, JPG, GIF, or WebP." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image must be under 4 MB." };
  }
  await fs.mkdir(AVATAR_DIR, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());

  let webp: Buffer;
  try {
    // .rotate() honors EXIF orientation, then strips metadata when we don't
    // pass .withMetadata(), giving us EXIF-free output (no GPS, no camera info).
    webp = await sharp(buf)
      .rotate()
      .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (e) {
    logger.warn("avatar.processing_failed", {
      user_id: userId,
      type: file.type,
      size: file.size,
      err: e instanceof Error ? e.message : String(e),
    });
    return { error: "Couldn't process that image. Try a different file." };
  }

  // Remove older avatar files (any extension) for this user.
  for (const e of ["png", "jpg", "gif", "webp"]) {
    await fs.rm(path.join(AVATAR_DIR, `${userId}.${e}`), { force: true });
  }

  const filename = `${userId}.webp`;
  const fullPath = path.join(AVATAR_DIR, filename);
  await fs.writeFile(fullPath, webp);
  return `/avatars/${filename}`;
}
