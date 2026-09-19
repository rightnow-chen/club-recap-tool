import { NextResponse } from "next/server";
import { buildContext } from "@/lib/generation/types";
import { asActivityType } from "@/lib/generation/types";
import { buildPrompts } from "@/lib/generation/prompt";
import { articleSchema, parseGeneration } from "@/lib/generation/schema";
import { buildQualitySignals, runDeterministicQualityChecks } from "@/lib/generation/quality";
import type { FormData, ImageAsset } from "@/lib/types";
export const runtime = "nodejs";
function bad(
  message: string,
  status = 400,
  preserved?: { form: FormData; images: ImageAsset[] },
) {
  return NextResponse.json(
    { status: "failed", error: message, ...(preserved ? { input: preserved } : {}) },
    { status },
  );
}
function extractModelResult(raw: string) {
  let envelope: Record<string, any>;
  try {
    envelope = JSON.parse(raw) as Record<string, any>;
  } catch {
    throw new Error("模型没有返回合法 JSON，请重试。");
  }
  const content = envelope.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("模型响应为空，请重试。");
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("模型没有返回合法 JSON，请重试。");
  }
}
function hasIndependentTitles(value: unknown) {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  const titles = result.titles;
  return (
    Array.isArray(titles) &&
    titles.length === 3 &&
    titles.every((title) => typeof title === "string" && !/[|｜]/.test(title)) &&
    new Set(titles).size === 3
  );
}
async function generateTitleCandidates(
  apiKey: string,
  model: string,
  context: unknown,
) {
  const response = await fetch("https://qianfan.baidubce.com/v2/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            "你是高校社团公众号编辑。只生成三条不同风格的活动回顾标题。所有事实只能来自给定资料。必须只返回 JSON：{\"titles\":[\"标题一\",\"标题二\",\"标题三\"]}。titles 必须恰好 3 条，每条独立且语义不同；禁止使用 |、｜、换行或编号拼接标题。",
        },
        { role: "user", content: JSON.stringify(context) },
      ],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) return null;
  const result = extractModelResult(await response.text());
  if (!hasIndependentTitles(result)) return null;
  return (result as { titles: string[] }).titles;
}
export async function POST(request: Request) {
  const started = Date.now();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad("请求体不是有效 JSON。");
  }
  if (typeof body !== "object" || body === null) return bad("请求体结构无效。");
  const data = body as Record<string, unknown>;
  const form = data.form as FormData;
  const images = data.images as ImageAsset[];
  if (!form || !Array.isArray(images)) return bad("缺少表单或图片数据。");
  const required = [
    "type",
    "name",
    "date",
    "place",
    "organizer",
    "brief",
    "flow",
    "tone",
  ];
  const missing = required.filter(
    (k) =>
      typeof form[k as keyof FormData] !== "string" ||
      !String(form[k as keyof FormData]).trim(),
  );
  if (missing.length) return bad(`必填字段未填写：${missing.join("、")}`, 400, { form, images });
  const type = asActivityType(form.type);
  const context = buildContext({ ...form, type }, images);
  const preflight = buildQualitySignals({ ...form, type });
  const ids = new Set(images.filter((p) => p.is_used).map((p) => p.image_id));
  const apiKey = process.env.QIANFAN_API_KEY;
  if (!apiKey) return bad("服务端尚未配置 QIANFAN_API_KEY，未调用模型。", 503, { form, images });
  const prompts = buildPrompts(type, context);
  const payload = {
    model: process.env.QIANFAN_MODEL || "ernie-5.1",
    messages: [
      { role: "system", content: prompts.system },
      { role: "user", content: prompts.user },
    ],
    temperature: 0.4,
    max_tokens: 5000,
    response_format: {
      type: "json_schema",
      json_schema: { name: "club_recap_article", schema: articleSchema },
    },
  };
  try {
    const response = await fetch(
      "https://qianfan.baidubce.com/v2/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(120_000),
      },
    );
    const raw = await response.text();
    if (!response.ok) {
      let providerMessage = "";
      let providerCode = "";
      try {
        const providerError = JSON.parse(raw) as Record<string, unknown>;
        providerMessage = String(
          providerError.message ?? providerError.error_description ?? "",
        ).trim();
        providerCode = String(
          providerError.code ?? providerError.error_code ?? providerError.type ?? "",
        ).trim();
      } catch {
        // Keep the provider response hidden when it is not JSON.
      }
      const detail = [providerCode, providerMessage].filter(Boolean).join("：");
      return bad(
        `模型服务请求失败（${response.status}）${detail ? `：${detail}` : ""}。`,
        502,
        { form, images },
      );
    }
    try {
      const modelResult = extractModelResult(raw);
      const parsed = parseGeneration(modelResult, ids);
      if (!hasIndependentTitles(modelResult)) {
        const titles = await generateTitleCandidates(apiKey, payload.model, context);
        if (titles) parsed.titles = titles;
      }
      parsed.pending_confirmation = [
        ...preflight.pending_confirmation,
        ...parsed.pending_confirmation,
        ...runDeterministicQualityChecks(parsed, { ...form, type }, images),
      ].filter((item, index, all) =>
        all.findIndex((candidate) => candidate.field === item.field && candidate.message === item.message) === index,
      );
      return NextResponse.json({
        status: "success",
        result: parsed,
        latency_ms: Date.now() - started,
        model: payload.model,
      });
    } catch {
      // The model can occasionally ignore the response schema. Retry once
      // with a stricter final instruction before surfacing a failure.
      const retryPayload = {
        ...payload,
        temperature: 0,
        messages: [
          ...payload.messages,
          {
            role: "user",
            content:
              `上一次没有按结构输出。现在只返回一个合法 JSON 对象，不能有任何额外文字。\n\n必须严格遵守：\n- titles 是长度恰好为 3 的字符串数组，三条标题语义不同，每条只是一句独立标题；不得使用 |、｜、换行或编号把标题拼在一起。\n- summary、intro.text、ending 必须是不同文案，不能互相复制。\n- intro 与 sections 中的每项都必须包含 type、text、image_id、caption；没有图片时 image_id 为 null，caption 为 \"\"。\n- 必须包含 pending_confirmation 数组。`,
          },
        ],
      };
      const retryResponse = await fetch(
        "https://qianfan.baidubce.com/v2/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(retryPayload),
          signal: AbortSignal.timeout(120_000),
        },
      );
      if (!retryResponse.ok)
        throw new Error(`模型服务请求失败（${retryResponse.status}）。`);
      const retryResult = extractModelResult(await retryResponse.text());
      const parsed = parseGeneration(retryResult, ids);
      if (!hasIndependentTitles(retryResult)) {
        const titles = await generateTitleCandidates(apiKey, payload.model, context);
        if (titles) parsed.titles = titles;
      }
      parsed.pending_confirmation = [
        ...preflight.pending_confirmation,
        ...parsed.pending_confirmation,
        ...runDeterministicQualityChecks(parsed, { ...form, type }, images),
      ].filter((item, index, all) =>
        all.findIndex((candidate) => candidate.field === item.field && candidate.message === item.message) === index,
      );
      return NextResponse.json({
        status: "success",
        result: parsed,
        latency_ms: Date.now() - started,
        model: payload.model,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "模型调用失败，请重试。";
    const friendly = /timeout|timed out|aborted/i.test(message)
      ? "模型请求超时，请稍后重试。"
      : /fetch failed|network|连接/i.test(message)
        ? "无法连接模型服务，请检查网络后重试。"
        : message;
    return bad(
      friendly,
      502,
      { form, images },
    );
  }
}
