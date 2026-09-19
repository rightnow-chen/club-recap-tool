const baseUrl = process.env.PHASE5_BASE_URL || "http://127.0.0.1:3000";

const completeForm = {
  type: "讲座 / 培训 / 分享",
  name: "秋季求职经验分享会",
  date: "2026年9月16日",
  time: "19:00",
  place: "大学生活动中心报告厅",
  organizer: "职业发展协会",
  brief: "帮助同学梳理求职准备思路、提升简历与面试能力。",
  flow: "嘉宾分享、简历案例分析、现场问答",
  highlights: "形成简历修改清单和面试准备建议。",
  guest: "李明，职业规划师",
  count: "120人",
  awards: "",
  thanks: "感谢分享嘉宾与现场同学。",
  next: "后续将发布资料整理。",
  tone: "正式",
  length: "适中",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function post(body, raw = false) {
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? body : JSON.stringify(body),
  });
  let data = null;
  try { data = await response.json(); } catch { /* response body is not JSON */ }
  return { response, data };
}

const malformed = await post("{", true);
assert(malformed.response.status === 400 && malformed.data?.status === "failed", "非法 JSON 未被拒绝");

const missing = await post({ form: { ...completeForm, name: "" }, images: [] });
assert(missing.response.status === 400 && missing.data?.status === "failed", "必填字段缺失未被拒绝");
assert(String(missing.data?.error).includes("name"), "必填字段错误没有指出字段");
assert(missing.data?.input?.form?.name === "", "失败响应没有保留用户输入");

if (process.env.PHASE5_RUN_LLM === "1") {
  const normal = await post({ form: completeForm, images: [] });
  assert(normal.response.ok && normal.data?.status === "success", "正常案例未生成成功");
  const result = normal.data.result;
  assert(Array.isArray(result.titles) && result.titles.length === 3, "正常案例标题数量不为 3");
  assert(new Set(result.titles).size === 3, "正常案例标题重复");
  assert(result.summary && result.intro?.text && result.ending, "正常案例结构不完整");
  console.log(JSON.stringify({
    case: "normal",
    status: normal.data.status,
    titles: result.titles,
    pending_confirmation: result.pending_confirmation,
  }, null, 2));
  const highRisk = await post({
    form: { ...completeForm, guest: "", count: "", awards: "", highlights: "" },
    images: [],
  });
  assert(highRisk.response.ok && highRisk.data?.status === "success", "高风险缺失案例未返回可审核结果");
  const pendingFields = new Set((highRisk.data.result.pending_confirmation || []).map((item) => item.field));
  for (const field of ["guest", "participant_count", "awards_or_results", "outcomes"]) {
    assert(pendingFields.has(field), `高风险缺失案例未提醒 ${field}`);
  }
  console.log(JSON.stringify({
    case: "missing-high-risk",
    status: highRisk.data.status,
    pending_confirmation: highRisk.data.result.pending_confirmation,
  }, null, 2));
} else {
  console.log("正常模型案例已保留为可选测试：PHASE5_RUN_LLM=1 npm run test:phase5");
}

console.log("phase5 contract tests passed: malformed JSON, required-field failure, input-preserving error path");
