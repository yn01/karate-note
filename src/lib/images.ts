// 送られてきた画像の種類を、申告ではなく中身の先頭で確かめる（ノートの写真・形の写真で共通）
export type ImageType = "image/jpeg" | "image/png" | "image/webp";

// 送信の上限（next.config の 4mb）より小さくして、こちらのことばで断れるようにする
export const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;

export function detectImageType(b: Buffer): ImageType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}
