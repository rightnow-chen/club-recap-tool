export async function createPreview(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(`${file.name}：请选择 JPG、PNG 或 WebP。`);
  if (file.size > 20 * 1024 * 1024)
    throw new Error(`${file.name}：单张原图请小于 20 MB。`);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    for (const size of [960, 720, 480, 320, 192]) {
      const scale = Math.min(
        1,
        size / Math.max(img.naturalWidth, img.naturalHeight),
      );
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("当前浏览器无法创建预览图。");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.7);
      if (data.length <= 18_000) return data;
    }
    throw new Error(`${file.name}：无法压缩到预览图限制，请选择较小图片。`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
