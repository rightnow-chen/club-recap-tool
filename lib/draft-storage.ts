import type { Workspace, FormData, ImageAsset } from "./types";
import { emptyForm } from "./mock-data";
export const STORAGE_KEY = "clubrecap.workspace.v2";
export const emptyWorkspace = (): Workspace => ({
  schema_version: 2,
  active_id: null,
  generation_history: [],
});
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const validForm = (v: unknown): v is FormData =>
  record(v) &&
  Object.keys(emptyForm).every((key) => typeof v[key] === "string");
const validImage = (v: unknown): v is ImageAsset =>
  record(v) &&
  typeof v.image_id === "string" &&
  Number.isInteger(v.image_order) &&
  Number(v.image_order) > 0 &&
  typeof v.src === "string" &&
  (typeof v.original_key === "string" ||
    typeof v.original_key === "undefined") &&
  (v.src.startsWith("data:image/jpeg;base64,") ||
    [
      "/images/check-in.svg",
      "/images/sharing.svg",
      "/images/group.svg",
    ].includes(v.src)) &&
  ["filename", "tag", "description"].every((k) => typeof v[k] === "string") &&
    ["is_used", "is_key", "mock"].every((k) => typeof v[k] === "boolean");
const validOutput = (v: unknown): boolean => {
  if (v === null) return true;
  if (!record(v)) return false;
  return (
    Array.isArray(v.titles) &&
    v.titles.every((x) => typeof x === "string") &&
    typeof v.summary === "string" &&
    record(v.intro) &&
    Array.isArray(v.sections) &&
    typeof v.ending === "string" &&
    Array.isArray(v.pending_confirmation)
  );
};
export function parseWorkspace(raw: string | null): Workspace {
  if (raw === null) return emptyWorkspace();
  const data: unknown = JSON.parse(raw);
  if (
    !record(data) ||
    data.schema_version !== 2 ||
    !Array.isArray(data.generation_history) ||
    !(data.active_id === null || typeof data.active_id === "string")
  )
    throw new Error(
      "草稿版本或结构无法读取，原始记录已保留，请勿清除浏览器数据。",
    );
  const ids = new Set<string>();
  for (const row of data.generation_history) {
    if (
      !record(row) ||
      typeof row.id !== "string" ||
      ids.has(row.id) ||
      typeof row.type !== "string" ||
      !["draft", "generated", "edited"].includes(String(row.status)) ||
      !validOutput(row.output) ||
      !validFeedback(row.feedback) ||
      typeof row.created_at !== "string" ||
      typeof row.updated_at !== "string" ||
      !Number.isFinite(Date.parse(row.created_at)) ||
      !Number.isFinite(Date.parse(row.updated_at)) ||
      !record(row.input) ||
      !validForm(row.input.form) ||
      !Array.isArray(row.input.images) ||
      !row.input.images.every(validImage) ||
      row.type !== row.input.form.type
    )
      throw new Error("本地草稿结构异常，原始记录已保留，未覆盖。");
    const images = (row.input.images as ImageAsset[]).map((image) => ({
      ...image,
      original_key: image.original_key ?? "",
    }));
    row.input.images = images;
    if (
      new Set(images.map((p) => p.image_id)).size !== images.length ||
      images.some((p, i) => p.image_order !== i + 1)
    )
      throw new Error("图片编号或顺序异常，原始记录已保留。");
    ids.add(row.id);
  }
  if (data.active_id !== null && !ids.has(data.active_id as string))
    throw new Error("当前草稿引用异常，原始记录已保留。");
  return data as unknown as Workspace;
}
function validFeedback(value: unknown): boolean {
  if (value === null) return true;
  if (!record(value)) return false;
  return (
    (value.rating === null || (Number.isInteger(value.rating) && Number(value.rating) >= 1 && Number(value.rating) <= 5)) &&
    (value.is_usable_for_review === null || typeof value.is_usable_for_review === "boolean") &&
    typeof value.comment === "string"
  );
}
export function writeWorkspace(
  next: Workspace,
  expected: string | null,
): string {
  if (localStorage.getItem(STORAGE_KEY) !== expected)
    throw new Error(
      "另一标签页已修改草稿。为避免覆盖，当前修改尚未保存；请保留当前输入并核对其他标签页。",
    );
  const raw = JSON.stringify(next);
  if (raw.length > 2_200_000)
    throw new Error(
      "本地容量接近上限，当前修改尚未保存。请减少当前图片数量后重试；已保存草稿未被覆盖。",
    );
  localStorage.setItem(STORAGE_KEY, raw);
  return raw;
}
