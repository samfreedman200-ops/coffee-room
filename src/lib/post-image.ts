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
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB pre-resize
const POST_IMAGE_DIR = path.join(process.cwd(), "public", "post-images");
const MAX_W = 1600;
const MAX_H = 1200;

export async function savePostImage(
  postId: string,
  file: File,
): Promise<string | { error: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Image must be PNG, JPG, GIF, or WebP." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image must be under 8 MB." };
  }
  await fs.mkdir(POST_IMAGE_DIR, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());

  let webp: Buffer;
  try {
    // .rotate() honors EXIF, then metadata is stripped by default so no
    // GPS / device info leaks. Resize bounds the output to a sane CDN-ish size.
    webp = await sharp(buf)
      .rotate()
      .resize({
        width: MAX_W,
        height: MAX_H,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (e) {
    logger.warn("post_image.processing_failed", {
      post_id: postId,
      type: file.type,
      size: file.size,
      err: e instanceof Error ? e.message : String(e),
    });
    return { error: "Couldn't process that image." };
  }

  const filename = `${postId}.webp`;
  const fullPath = path.join(POST_IMAGE_DIR, filename);
  await fs.writeFile(fullPath, webp);
  return `/post-images/${filename}`;
}

export async function deletePostImage(imagePath: string): Promise<void> {
  if (!imagePath.startsWith("/post-images/")) return;
  const filename = imagePath.slice("/post-images/".length);
  await fs.rm(path.join(POST_IMAGE_DIR, filename), { force: true });
}
