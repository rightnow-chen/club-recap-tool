import type { FormData, ImageAsset } from "@/lib/types";
import { buildQualitySignals } from "./quality";
export const ACTIVITY_TYPES = [
  "讲座 / 培训 / 分享",
  "比赛 / 展示 / 展演",
  "志愿 / 公益 / 实践",
  "会议 / 主题教育 / 组织活动",
  "仪式 / 典礼",
  "文体 / 联谊 / 团建",
  "参访 / 交流 / 研学",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type GenerationContext = {
  confirmed_facts: Record<string, string>;
  event_process: Record<string, string>;
  image_context: Pick<
    ImageAsset,
    "image_id" | "image_order" | "tag" | "description" | "is_used" | "is_key"
  >[];
  generation_preferences: { tone: string; length: string };
  missing_information: string[];
  forbidden_inferences: string[];
};
export type GenerationResult = {
  titles: string[];
  summary: string;
  intro: {
    type: string;
    text: string;
    image_id: string | null;
    caption: string;
  };
  sections: {
    type: string;
    text: string;
    image_id: string | null;
    caption: string;
  }[];
  ending: string;
  pending_confirmation: {
    field: string;
    message: string;
    severity: "info" | "warning" | "blocking";
  }[];
};
export function asActivityType(value: string): ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value)
    ? (value as ActivityType)
    : ACTIVITY_TYPES[0];
}
export function buildContext(
  form: FormData,
  images: ImageAsset[],
): GenerationContext {
  const quality = buildQualitySignals(form);
  return {
    confirmed_facts: {
      activity_name: form.name,
      activity_type: form.type,
      date: form.date,
      time: form.time,
      place: form.place,
      organizer: form.organizer,
      guest: form.guest,
      participant_count: form.count,
      awards_or_results: form.awards,
    },
    event_process: {
      purpose: form.brief,
      flow: form.flow,
      highlights: form.highlights,
      thanks: form.thanks,
      next: form.next,
    },
    image_context: images
      .filter((p) => p.is_used)
      .map(({ image_id, image_order, tag, description, is_used, is_key }) => ({
        image_id,
        image_order,
        tag,
        description,
        is_used,
        is_key,
      })),
    generation_preferences: { tone: form.tone, length: form.length },
    missing_information: quality.missing_information,
    forbidden_inferences: quality.forbidden_inferences,
  };
}
