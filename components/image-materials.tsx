"use client";
import { useRef, useState } from "react";
import { ImagePlus, Star, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { usePrototype } from "./prototype-provider";
import { mockImages } from "@/lib/mock-data";
import { createPreview } from "@/lib/image-preview";
import { saveOriginal, deleteOriginal } from "@/lib/image-storage";
export function ImageMaterials() {
  const { images, setImages, uploading, setUploading } = usePrototype();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  async function preview(files: FileList | null) {
    if (!files || uploading) return;
    const selected = Array.from(files);
    if (
      selected.some(
        (f) => !["image/jpeg", "image/png", "image/webp"].includes(f.type),
      )
    ) {
      setError("请选择 JPG、PNG 或 WebP 格式的图片。");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const photos: { src: string; filename: string; original_key: string }[] =
        [];
      // Decode sequentially so a batch of phone photos doesn't exhaust memory.
      for (const file of selected) {
        const image_id = crypto.randomUUID();
        photos.push({
          src: await createPreview(file),
          filename: file.name,
          original_key: image_id,
        });
        await saveOriginal(image_id, file);
      }
      setImages((old) => [
        ...old,
        ...photos.map((photo, i) => ({
          ...photo,
          image_id: photo.original_key,
          image_order: old.length + i + 1,
          tag: "",
          description: "",
          is_used: true,
          is_key: false,
          mock: false,
        })),
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "图片无法读取。本批次未添加，请重新选择。",
      );
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }
  function move(index: number, direction: number) {
    setImages((old) => {
      const next = [...old];
      const target = index + direction;
      if (target < 0 || target >= next.length) return old;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  return (
    <>
      <p className="field-caption">
        活动照片{" "}
        <span className="optional">推荐 3–10 张 · 自动保存压缩预览图</span>
      </p>
      <input
        ref={input}
        id="photo-upload"
        type="file"
        multiple
        disabled={uploading}
        accept="image/jpeg,image/png,image/webp"
        className="visually-hidden"
        onChange={(e) => preview(e.target.files)}
        aria-label="选择活动照片"
      />
      <button
        type="button"
        className="upload-zone"
        disabled={uploading}
        onClick={() => input.current?.click()}
      >
        <span className="upload-icon">
          <ImagePlus size={25} />
        </span>
        <strong>{uploading ? "正在处理照片…" : "选择活动照片"}</strong>
        <span>JPG、PNG、WebP · 单张 ≤ 20 MB · 原图请自行保留</span>
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="photo-help">
        <span>也可以不添加照片，直接浏览后续页面。</span>
        <button
          className="text-button"
          type="button"
          disabled={uploading}
          onClick={() =>
            setImages((old) => [
              ...old,
              ...mockImages.map((p) => ({
                ...p,
                image_id: crypto.randomUUID(),
              })),
            ])
          }
        >
          使用示例图片
        </button>
      </div>
      <div className="image-grid">
        {images.map((photo, index) => (
          <article className="material-card" key={photo.image_id}>
            <div className="material-preview">
              <img src={photo.src} alt={photo.description || photo.filename} />
              <span className="image-number">
                图 {photo.image_order}
                {photo.mock ? " · 示例插画" : ""}
              </span>
              <button
                type="button"
                className="icon-button remove"
                aria-label={`移除图 ${photo.image_order}`}
                onClick={async () => {
                  await deleteOriginal(photo.original_key);
                  setImages((old) =>
                    old.filter((p) => p.image_id !== photo.image_id),
                  );
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="material-body">
              <span className="filename">{photo.filename}</span>
              <label htmlFor={"tag-" + photo.image_id}>图片场景标签</label>
              <select
                id={"tag-" + photo.image_id}
                value={photo.tag}
                onChange={(e) =>
                  setImages((old) =>
                    old.map((p) =>
                      p.image_id === photo.image_id
                        ? { ...p, tag: e.target.value }
                        : p,
                    ),
                  )
                }
              >
                <option value="">选择场景</option>
                {[
                  "签到",
                  "现场布置",
                  "主持人开场",
                  "分享",
                  "互动",
                  "作品展示",
                  "比赛现场",
                  "颁奖",
                  "志愿服务",
                  "合影",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <label htmlFor={"description-" + photo.image_id}>图片描述</label>
              <input
                id={"description-" + photo.image_id}
                value={photo.description}
                placeholder="用一句话描述画面"
                onChange={(e) =>
                  setImages((old) =>
                    old.map((p) =>
                      p.image_id === photo.image_id
                        ? { ...p, description: e.target.value }
                        : p,
                    ),
                  )
                }
              />
              <div className="photo-options">
                <label>
                  <input
                    type="checkbox"
                    checked={photo.is_used}
                    onChange={(e) =>
                      setImages((old) =>
                        old.map((p) =>
                          p.image_id === photo.image_id
                            ? { ...p, is_used: e.target.checked }
                            : p,
                        ),
                      )
                    }
                  />
                  是否使用该图
                </label>
                <button
                  type="button"
                  className={"star-button " + (photo.is_key ? "featured" : "")}
                  aria-pressed={photo.is_key}
                  aria-label={`图 ${photo.image_order}重点照片`}
                  onClick={() =>
                    setImages((old) =>
                      old.map((p) =>
                        p.image_id === photo.image_id
                          ? { ...p, is_key: !p.is_key }
                          : p,
                      ),
                    )
                  }
                >
                  <Star
                    size={15}
                    fill={photo.is_key ? "currentColor" : "none"}
                  />
                  重点照片
                </button>
              </div>
              <div className="photo-options">
                <button
                  type="button"
                  className="text-button"
                  disabled={index === 0}
                  aria-label={`上移图 ${photo.image_order}`}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={14} />
                  上移
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={index === images.length - 1}
                  aria-label={`下移图 ${photo.image_order}`}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={14} />
                  下移
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
