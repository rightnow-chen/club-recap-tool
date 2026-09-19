"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, History, List, MoveDown, MoveUp, Trash2 } from "lucide-react";
import { Steps, PageHeading, MockNotice } from "@/components/shell";
import { mockResult } from "@/lib/mock-data";
import { TitleCard } from "@/components/article-cards";
import { usePrototype } from "@/components/prototype-provider";
import type { GenerationResult } from "@/lib/generation/types";
import type { ImageAsset } from "@/lib/types";

type Section = GenerationResult["intro"];

function repairStoredResult(result: GenerationResult): GenerationResult {
  const titleParts = result.titles
    .flatMap((title) => title.split(/[\n|｜]+/))
    .map((title) => title.trim())
    .filter(Boolean)
    .filter((title, index, all) => all.indexOf(title) === index);
  const base = titleParts[0] || "活动回顾";
  for (const suffix of ["现场回顾", "精彩瞬间"]) {
    const next = `${base}｜${suffix}`;
    if (!titleParts.includes(next)) titleParts.push(next);
  }
  const intro = result.intro.text;
  const firstSentence = intro.match(/[^。！？!?]+[。！？!?]?/)?.[0]?.trim() || intro;
  const summary = result.summary === intro ? firstSentence : result.summary;
  const ending =
    result.ending === intro || result.ending === result.summary
      ? "更多活动细节将结合现场素材继续完善。"
      : result.ending;
  const introImageDuplicated = Boolean(
    result.intro.image_id &&
      result.sections.some((section) => section.image_id === result.intro.image_id),
  );
  const paragraphs = intro
    .split(/\r?\n\s*\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (result.sections.length === 0 && paragraphs.length > 1) {
    return {
      ...result,
      titles: titleParts.slice(0, 3),
      summary,
      intro: { ...result.intro, text: paragraphs[0], image_id: null, caption: "" },
      sections: paragraphs.slice(1, -1).map((text, index) => ({
        type: `活动回顾 ${index + 1}`,
        text,
        image_id: index === 0 ? result.intro.image_id : null,
        caption: index === 0 ? result.intro.caption : "",
      })),
      ending: paragraphs[paragraphs.length - 1],
    };
  }
  return {
    ...result,
    titles: titleParts.slice(0, 3),
    summary,
    ending,
    intro: introImageDuplicated
      ? { ...result.intro, image_id: null, caption: "" }
      : result.intro,
  };
}

function copyFallback(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

export default function ResultPage() {
  const { generatedResult, images, updateGeneratedResult, history, activeId, updateFeedback } = usePrototype();
  const [draft, setDraft] = useState<GenerationResult | null>(generatedResult);
  const [titleIndex, setTitleIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState({ rating: null as number | null, is_usable_for_review: null as boolean | null, comment: "" });
  useEffect(() => setDraft(generatedResult), [generatedResult]);
  useEffect(() => {
    const stored = history.find((item) => item.id === activeId)?.feedback;
    setFeedback(stored || { rating: null, is_usable_for_review: null, comment: "" });
  }, [history, activeId]);
  useEffect(() => {
    if (!generatedResult) return;
    const repaired = repairStoredResult(generatedResult);
    if (JSON.stringify(repaired) !== JSON.stringify(generatedResult)) {
      updateGeneratedResult(repaired);
    }
  }, [generatedResult, updateGeneratedResult]);
  const imageMap = useMemo(() => new Map(images.map((image) => [image.image_id, image])), [images]);
  function commit(next: GenerationResult) { setDraft(next); updateGeneratedResult(next); }
  function sectionsOf(result: GenerationResult): Section[] { return [result.intro, ...result.sections]; }
  function updateSection(index: number, patch: Partial<Section>) {
    if (!draft) return;
    const all = sectionsOf(draft).map((section, i) => i === index ? { ...section, ...patch } : section);
    commit({ ...draft, intro: all[0], sections: all.slice(1) });
  }
  function imageSlots() { return draft ? sectionsOf(draft).map((section, index) => section.image_id ? index : -1).filter((index) => index >= 0) : []; }
  function moveImage(index: number, direction: -1 | 1) {
    if (!draft) return;
    const slots = imageSlots(); const position = slots.indexOf(index); const target = slots[position + direction];
    if (position < 0 || target === undefined) return;
    const all = sectionsOf(draft); const current = all[index]; const next = all[target];
    const swapped = all.map((section, i) => i === index ? { ...section, image_id: next.image_id, caption: next.caption } : i === target ? { ...section, image_id: current.image_id, caption: current.caption } : section);
    commit({ ...draft, intro: swapped[0], sections: swapped.slice(1) });
  }
  function exportText(result: GenerationResult, selectedTitle: string) {
    const blocks = [selectedTitle, `摘要：${result.summary}`, `导语：${result.intro.text}`];
    if (result.intro.image_id) {
      const image = imageMap.get(result.intro.image_id);
      if (image) blocks.push(`【图片：图${image.image_order}｜${result.intro.caption || image.tag}】`);
    }
    sectionsOf(result).slice(1).forEach((section) => {
      blocks.push(`${section.type}：${section.text}`);
      if (section.image_id) { const image = imageMap.get(section.image_id); if (image) blocks.push(`【图片：图${image.image_order}｜${section.caption || image.tag}】`); }
    });
    blocks.push(`结尾：${result.ending}`);
    if (result.pending_confirmation.length) blocks.push(`待确认：${result.pending_confirmation.map((item) => item.message).join("；")}`);
    return blocks.join("\n\n");
  }
  async function copyArticle() {
    if (!draft) return;
    const text = exportText(draft, draft.titles[titleIndex] || draft.titles[0]);
    try { await navigator.clipboard.writeText(text); } catch { copyFallback(text); }
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }
  if (!generatedResult || !draft) return <MockResult />;
  const selectedTitle = draft.titles[titleIndex] || draft.titles[0];
  return <main id="main" className="page-wrap">
    <Steps active={3} />
    <PageHeading eyebrow="STEP 03 / REVIEW & DELIVER" title="先审核，再把图文带走" description="图片位置由规则给出建议，标题、正文和图注都可以继续修改."><Link href="/input" className="button secondary"><ArrowLeft size={16} />返回素材</Link></PageHeading>
    <MockNotice>模型负责内容和候选图注；图片位置、排序和删除由规则与用户共同控制。</MockNotice>
    <div className="result-layout"><div>
      <section className="panel title-panel"><div className="card-heading"><h2>标题候选</h2><span>选择后可直接修改</span></div><div className="title-list">{draft.titles.map((text, i) => <TitleCard key={i} title={text} index={i} selected={i === titleIndex} onSelect={() => setTitleIndex(i)} />)}</div><label className="field-label" htmlFor="final-title">最终标题</label><input id="final-title" className="text-input" value={selectedTitle} onChange={(event) => { const titles = [...draft.titles]; titles[titleIndex] = event.target.value; commit({ ...draft, titles }); }} /></section>
      <article className="article-paper"><div className="article-kicker">CLUB RECAP <span>活动回顾 · 可编辑初稿</span></div><h1>{selectedTitle}</h1><section id="summary" className="article-summary"><span>摘要</span><textarea value={draft.summary} onChange={(event) => commit({ ...draft, summary: event.target.value })} /></section>
        <section className="article-section"><div className="section-label"><span>导语</span>导语</div><textarea value={draft.intro.text} onChange={(event) => updateSection(0, { text: event.target.value })} /><EditableImage section={draft.intro} index={0} imageMap={imageMap} onCaption={(caption) => updateSection(0, { caption })} onMove={moveImage} onRemove={(index) => updateSection(index, { image_id: null, caption: "" })} /></section>
        {draft.sections.map((section, index) => <section className="article-section" id={`section-${index}`} key={`${section.type}-${index}`}><div className="section-label"><span>{String(index + 1).padStart(2, "0")}</span>{section.type}</div><h2>{section.type}</h2><textarea value={section.text} onChange={(event) => updateSection(index + 1, { text: event.target.value })} /><EditableImage section={section} index={index + 1} imageMap={imageMap} onCaption={(caption) => updateSection(index + 1, { caption })} onMove={moveImage} onRemove={(index) => updateSection(index, { image_id: null, caption: "" })} /></section>)}
        <section className="article-section"><div className="section-label"><span>END</span>结尾</div><textarea value={draft.ending} onChange={(event) => commit({ ...draft, ending: event.target.value })} /></section>
      </article>
    </div><aside className="result-aside"><div className="panel article-toc"><h2><List size={18} />文章目录</h2><a href="#summary">摘要</a>{draft.sections.map((section, i) => <a key={i} href={`#section-${i}`}>{section.type}</a>)}</div><div className="panel"><h2>待确认项</h2>{draft.pending_confirmation.length ? draft.pending_confirmation.map((item) => <p key={item.field}>{item.message}</p>) : <p className="muted">当前没有待确认项。</p>}</div></aside></div>
    <section className="panel feedback-panel">
      <div className="card-heading"><h2>使用反馈</h2><span>帮助记录本次初稿是否可交审</span></div>
      <div className="feedback-row"><span>整体评分</span><div className="rating-options" role="group" aria-label="整体评分">{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} className={feedback.rating === rating ? "selected" : ""} aria-pressed={feedback.rating === rating} onClick={() => { const next = { ...feedback, rating }; setFeedback(next); updateFeedback(next); }}>{rating} 分</button>)}</div></div>
      <label className="feedback-check"><input type="checkbox" checked={feedback.is_usable_for_review === true} onChange={(event) => { const next = { ...feedback, is_usable_for_review: event.target.checked }; setFeedback(next); updateFeedback(next); }} /> 少量修改后可以交审</label>
      <label className="field-label" htmlFor="feedback-comment">文字意见</label><textarea id="feedback-comment" value={feedback.comment} placeholder="记录事实问题、结构问题或可用之处" onChange={(event) => setFeedback((current) => ({ ...current, comment: event.target.value }))} onBlur={() => updateFeedback(feedback)} />
    </section>
    <div className="page-actions"><button className="button primary" onClick={copyArticle}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "已复制全文" : "复制全文"}</button><Link href="/drafts" className="button secondary"><History size={17} />历史草稿</Link></div>
  </main>;
}

function EditableImage({ section, index, imageMap, onCaption, onMove, onRemove }: { section: Section; index: number; imageMap: Map<string, ImageAsset>; onCaption: (value: string) => void; onMove: (index: number, direction: -1 | 1) => void; onRemove: (index: number) => void }) {
  if (!section.image_id) return null;
  const image = imageMap.get(section.image_id); if (!image) return null;
  return <figure className="article-image"><img src={image.src} alt={image.description || image.tag} /><figcaption><span>图{image.image_order} · {image.tag}</span><input value={section.caption} placeholder="修改图注" onChange={(event) => onCaption(event.target.value)} /><div className="image-actions"><button className="icon-button" onClick={() => onMove(index, -1)} title="图片上移"><MoveUp size={15} /></button><button className="icon-button" onClick={() => onMove(index, 1)} title="图片下移"><MoveDown size={15} /></button><button className="icon-button danger" onClick={() => onRemove(index)} title="删除图片卡片"><Trash2 size={15} /></button></div></figcaption></figure>;
}

function MockResult() {
  const [title, setTitle] = useState(0);
  return <main id="main" className="page-wrap"><Steps active={3} /><PageHeading eyebrow="STEP 03 / YOUR STORY" title="现场的片段，连成了一篇故事" description="当前显示固定示例稿。完成一次生成后，可编辑并复制全文."><Link href="/input" className="button secondary"><ArrowLeft size={16} />返回素材</Link></PageHeading><MockNotice>尚未有本次生成结果，请从确认页点击“生成图文初稿”。</MockNotice><section className="panel title-panel"><div className="card-heading"><h2>标题候选</h2><span>固定示例</span></div><div className="title-list">{mockResult.titles.map((text, i) => <TitleCard key={text} title={text} index={i} selected={i === title} onSelect={() => setTitle(i)} />)}</div></section><div className="page-actions"><Link href="/confirm" className="button secondary"><ArrowLeft size={17} />返回确认</Link><Link href="/drafts" className="button primary"><History size={17} />浏览历史草稿</Link></div></main>;
}
