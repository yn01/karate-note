// ブラウザで写真を縮めてから送る（ノートの写真・形の写真で共通）
const MAX_UPLOAD = 3.4 * 1024 * 1024; // サーバーの上限（3.5MB）より少し小さく

// 写真を長辺 1600px の JPEG に縮める（iPhone の写真は数MBあるため）。大きければ品質を下げる
export async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  try {
    for (const quality of [0.85, 0.7, 0.5]) {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", quality),
      );
      if (blob.size <= MAX_UPLOAD) return blob;
    }
    throw new Error("too large");
  } finally {
    // Safari のキャンバスのメモリを早く手放す
    canvas.width = 0;
    canvas.height = 0;
  }
}
