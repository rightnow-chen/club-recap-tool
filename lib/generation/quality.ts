import type { FormData, ImageAsset } from "@/lib/types";
import type { GenerationResult } from "./types";

export type QualitySignal = {
  missing_information: string[];
  forbidden_inferences: string[];
  pending_confirmation: GenerationResult["pending_confirmation"];
};

const isBlank = (value: unknown) => !String(value ?? "").trim();

export function buildQualitySignals(form: FormData): QualitySignal {
  const missing_information: string[] = [];
  const forbidden_inferences: string[] = [];
  const pending_confirmation: GenerationResult["pending_confirmation"] = [];
  const add = (field: string, missing: string, forbidden: string, message: string) => {
    if (!missing_information.includes(missing)) missing_information.push(missing);
    forbidden_inferences.push(forbidden);
    pending_confirmation.push({ field, message, severity: "warning" });
  };

  if (isBlank(form.date)) {
    add("date", "date", "不得补写或推测活动日期、时间。", "活动日期未提供，生成后请核对时间信息。");
  }
  if (isBlank(form.place)) {
    add("place", "place", "不得补写或推测活动地点。", "活动地点未提供，生成后请核对地点信息。");
  }
  if (isBlank(form.organizer)) {
    add("organizer", "organizer", "不得补写或推测主办、承办或协办单位。", "主办/承办方未提供，生成后请核对组织信息。");
  }
  if (isBlank(form.guest)) {
    add("guest", "guest", "不得补充嘉宾姓名、职称、履历、奖项或其他身份。", "嘉宾姓名/身份未提供，不应在文稿中补充相关信息。");
  }
  if (isBlank(form.count)) {
    add("participant_count", "participant_count", "不得生成具体人数或“百余名”“数百人”等规模表达。", "参与人数未提供，不应生成任何人数规模表述。");
  }
  if (isBlank(form.awards)) {
    add("awards_or_results", "awards_or_results", "不得生成具体奖项、获奖名单、名次或未经确认的成果。", "奖项/活动成果未提供，请核对文稿中的相关表述。");
  }
  if (isBlank(form.highlights)) {
    add("outcomes", "outcomes", "不得生成“反响热烈”“圆满成功”等未经确认的成果结论。", "明确活动成果未提供，生成后请核对结论性表述。");
  }
  if (isBlank(form.thanks)) missing_information.push("thanks");
  if (isBlank(form.next)) missing_information.push("next");
  return { missing_information, forbidden_inferences, pending_confirmation };
}

function textOf(result: GenerationResult) {
  return [
    ...result.titles,
    result.summary,
    result.intro.text,
    ...result.sections.flatMap((section) => [section.type, section.text, section.caption]),
    result.ending,
  ].join("\n");
}

function addWarning(
  warnings: GenerationResult["pending_confirmation"],
  field: string,
  message: string,
) {
  if (!warnings.some((item) => item.field === field && item.message === message)) {
    warnings.push({ field, message, severity: "warning" });
  }
}

export function runDeterministicQualityChecks(
  result: GenerationResult,
  form: FormData,
  images: ImageAsset[],
) {
  const warnings: GenerationResult["pending_confirmation"] = [];
  const text = textOf(result);
  if (result.titles.length !== 3 || new Set(result.titles).size !== 3) {
    addWarning(warnings, "titles", "标题候选不足 3 条或存在重复，请人工调整后再交付。");
  }
  if (!result.summary.trim() || !result.intro.text.trim() || !result.ending.trim()) {
    addWarning(warnings, "structure", "摘要、导语或结尾为空，请补充后再交付。");
  }
  if (result.sections.length === 0) {
    addWarning(warnings, "sections", "正文活动过程段落缺失，请人工补充或重新生成。");
  }
  const usedIds = new Set(images.filter((image) => image.is_used).map((image) => image.image_id));
  for (const section of [result.intro, ...result.sections]) {
    if (section.image_id && !usedIds.has(section.image_id)) {
      addWarning(warnings, "images", `段落引用了不可用图片 ${section.image_id}，请重新匹配图片。`);
    }
  }
  if (isBlank(form.count) && /(?:\d+\s*(?:名|人|位)|百余|数百|上百|数十)/.test(text)) {
    addWarning(warnings, "participant_count", "输入未提供参与人数，但文稿出现了具体人数或规模表达。");
  }
  if (isBlank(form.awards) && /(?:一等奖|二等奖|三等奖|冠军|亚军|季军|获奖名单|具体奖项|获奖)/.test(text)) {
    addWarning(warnings, "awards_or_results", "输入未提供奖项，但文稿出现了奖项或获奖表述。");
  }
  if (isBlank(form.guest) && /(?:教授|副教授|博士|硕士|老师|讲师|工程师|主任|院长|校长|专家|负责人|主席|经理)/.test(text)) {
    addWarning(warnings, "guest", "输入未提供嘉宾身份，但文稿出现了职称或身份描述。");
  }
  if (isBlank(form.awards) && isBlank(form.highlights) && /(?:反响热烈|圆满成功|圆满落幕|取得(?:了)?(?:显著|良好)?成果|成效显著|广受好评|一致好评|成果丰硕)/.test(text)) {
    addWarning(warnings, "outcomes", "输入未提供明确成果，但文稿出现了未经确认的结论性表述。");
  }
  return warnings;
}
