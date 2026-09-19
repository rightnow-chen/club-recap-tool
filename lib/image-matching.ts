import type { ImageAsset } from "./types";
import type { GenerationResult } from "./generation/types";

const keywords: Record<string, string[]> = {
  intro: ["签到", "入场", "开场", "现场"],
  活动导语: ["签到", "入场", "现场"],
  导语: ["签到", "入场", "现场"],
  分享: ["分享", "讲解", "演讲", "过程"],
  讲座: ["分享", "讲解", "演讲"],
  比赛: ["比赛", "展示", "展演", "颁奖", "现场"],
  高光: ["高光", "互动", "展示", "颁奖", "比赛"],
  成果: ["成果", "作品", "展示", "合影"],
  互动: ["互动", "交流", "讨论"],
  结尾: ["合影", "收尾", "致谢"],
  致谢: ["合影", "收尾", "致谢"],
  ending: ["合影", "收尾", "致谢"],
};

function score(sectionType: string, image: ImageAsset) {
  const text = `${image.tag} ${image.description}`;
  const terms = Object.entries(keywords).find(([key]) =>
    sectionType.includes(key),
  )?.[1] || [];
  return (
    terms.reduce((sum, term) => sum + (text.includes(term) ? 5 : 0), 0) +
    (image.is_key ? 2 : 0) -
    image.image_order / 100
  );
}

export function applyImageSuggestions(
  result: GenerationResult,
  images: ImageAsset[],
): GenerationResult {
  const available = images.filter((image) => image.is_used);
  const used = new Set<string>();
  const all = [result.intro, ...result.sections];
  const mapped = all.map((section) => {
    if (section.image_id && available.some((image) => image.image_id === section.image_id)) {
      used.add(section.image_id);
      return section;
    }
    const candidate = available
      .filter((image) => !used.has(image.image_id))
      .sort((a, b) => score(section.type, b) - score(section.type, a))[0];
    if (!candidate) return section;
    used.add(candidate.image_id);
    return {
      ...section,
      image_id: candidate.image_id,
      caption: section.caption || candidate.description || candidate.tag,
    };
  });
  return {
    ...result,
    intro: mapped[0],
    sections: mapped.slice(1),
  };
}
