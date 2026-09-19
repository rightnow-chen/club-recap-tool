export const articleSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "titles",
    "summary",
    "intro",
    "sections",
    "ending",
    "pending_confirmation",
  ],
  properties: {
    titles: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    summary: { type: "string" },
    intro: { $ref: "#/$defs/section" },
    sections: { type: "array", items: { $ref: "#/$defs/section" } },
    ending: { type: "string" },
    pending_confirmation: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "message", "severity"],
        properties: {
          field: { type: "string" },
          message: { type: "string" },
          severity: { enum: ["info", "warning", "blocking"] },
        },
      },
    },
  },
  $defs: {
    section: {
      type: "object",
      additionalProperties: false,
      required: ["type", "text", "image_id", "caption"],
      properties: {
        type: { type: "string" },
        text: { type: "string" },
        image_id: { type: ["string", "null"] },
        caption: { type: "string" },
      },
    },
  },
} as const;
import type { GenerationResult } from "./types";

function uniqueTitles(values: unknown[], fallback: string) {
  const candidates = values
    .flatMap((value) => String(value).split(/[\n|｜]+/))
    .map((value) => value.replace(/^\s*(?:标题)?[一二三123]\s*[：:.、-]?\s*/, "").trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
  const base = candidates[0] || fallback || "活动回顾";
  const defaults = [base, `${base}｜现场回顾`, `${base}｜精彩瞬间`];
  for (const title of defaults) {
    if (!candidates.includes(title)) candidates.push(title);
    if (candidates.length === 3) break;
  }
  return candidates.slice(0, 3);
}

function sentences(text: string) {
  return text.match(/[^。！？!?；;]+[。！？!?；;]?/g)?.map((item) => item.trim()).filter(Boolean) || [];
}

function summaryFrom(text: string) {
  const parts = sentences(text);
  return (parts[0] || text).slice(0, 100);
}
export function parseGeneration(
  value: unknown,
  validIds: Set<string>,
): GenerationResult {
  if (typeof value !== "object" || value === null)
    throw new Error("模型返回不是 JSON 对象。");
  let v = value as Record<string, unknown>;
  for (const key of ["data", "article", "output", "result"]) {
    const nested = v[key];
    if (typeof nested === "object" && nested !== null && !Array.isArray(nested)) {
      v = nested as Record<string, unknown>;
      break;
    }
  }
  // Some enabled Qianfan model deployments still return the legacy
  // `{ title, content: [{ section, text }] }` shape even when JSON schema
  // output is requested. Convert that response using only model supplied
  // text so the rest of the app keeps one stable result contract.
  let rawLegacySections: unknown[] | null = Array.isArray(v.content)
    ? v.content
    : Array.isArray(v.sections)
      ? v.sections
      : null;
  if (!rawLegacySections && typeof v.content === "string") {
    try {
      const decoded = JSON.parse(v.content) as Record<string, unknown>;
      if (Array.isArray(decoded.content)) rawLegacySections = decoded.content;
      else if (Array.isArray(decoded.sections)) rawLegacySections = decoded.sections;
    } catch {
      if (v.content.trim()) {
        const paragraphs = v.content
          .split(/\r?\n\s*\r?\n+/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean);
        rawLegacySections = (paragraphs.length > 1 ? paragraphs : [v.content]).map(
          (text, index) => ({
            section:
              index === 0
                ? "活动导语"
                : index === paragraphs.length - 1
                  ? "活动收尾"
                  : "活动回顾",
            text,
          }),
        );
      }
    }
  }
  if (
    rawLegacySections &&
    (typeof v.title === "string" ||
      typeof v.headline === "string" ||
      Array.isArray(v.titles))
  ) {
    const legacySections = (rawLegacySections as unknown[])
      .filter(
        (item): item is {
          section?: string;
          type?: string;
          heading?: string;
          title?: string;
          text?: string;
          content?: string;
          body?: string;
          paragraph?: string;
        } =>
          typeof item === "object" &&
          item !== null &&
          (typeof (item as Record<string, unknown>).section === "string" ||
            typeof (item as Record<string, unknown>).type === "string" ||
            typeof (item as Record<string, unknown>).heading === "string" ||
            typeof (item as Record<string, unknown>).title === "string") &&
          (typeof (item as Record<string, unknown>).text === "string" ||
            typeof (item as Record<string, unknown>).content === "string" ||
            typeof (item as Record<string, unknown>).body === "string" ||
            typeof (item as Record<string, unknown>).paragraph === "string"),
      )
      .map((item) => ({
        type: item.section || item.type || item.heading || item.title || "正文",
        text: item.text || item.content || item.body || item.paragraph || "",
        image_id: null,
        caption: "",
      }));
    if (legacySections.length > 0) {
      const first = legacySections[0];
      const last = legacySections[legacySections.length - 1];
      const title =
        typeof v.title === "string"
          ? v.title
          : typeof v.headline === "string"
            ? v.headline
            : String((v.titles as unknown[])[0] || "活动回顾");
      v = {
        titles: uniqueTitles(
          Array.isArray(v.titles) ? v.titles : [title],
          title,
        ),
        summary: summaryFrom(first.text),
        intro: first,
        sections: legacySections.slice(1, -1),
        ending:
          legacySections.length > 1
            ? last.text
            : "以上为本次活动回顾初稿，请结合现场素材补充收尾内容。",
        pending_confirmation: [],
      };
    }
  }
  if (Array.isArray(v.titles)) {
    v.titles = uniqueTitles(v.titles, "活动回顾");
  }
  if (
    !Array.isArray(v.titles) ||
    v.titles.length !== 3 ||
    v.titles.some((x) => typeof x !== "string") ||
    typeof v.summary !== "string" ||
    typeof v.ending !== "string" ||
    !Array.isArray(v.sections) ||
    !Array.isArray(v.pending_confirmation)
  )
    throw new Error("模型返回缺少必要字段。");
  const sections = [v.intro, ...v.sections];
  for (const section of sections) {
    if (typeof section !== "object" || section === null)
      throw new Error("文章段落结构无效。");
    const s = section as Record<string, unknown>;
    if (
      typeof s.type !== "string" ||
      typeof s.text !== "string" ||
      typeof s.caption !== "string" ||
      !(typeof s.image_id === "string" || s.image_id === null) ||
      (typeof s.image_id === "string" && !validIds.has(s.image_id))
    )
      throw new Error("文章段落包含无效图片引用。");
  }
  return {
    titles: v.titles as string[],
    summary: v.summary,
    intro: v.intro as GenerationResult["intro"],
    sections: v.sections as GenerationResult["sections"],
    ending: v.ending,
    pending_confirmation:
      v.pending_confirmation as GenerationResult["pending_confirmation"],
  };
}
