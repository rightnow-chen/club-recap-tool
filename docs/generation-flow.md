# 第 3 阶段生成链路

`app/api/generate/route.ts` 是唯一服务端入口。它接收已保存的表单和图片元数据，检查必填字段，调用 `lib/generation/types.ts` 整理上下文，再将基础 Prompt、活动类型模板和上下文发给 ERNIE 5.1，最后按 `lib/generation/schema.ts` 解析并校验结构。

基础 Prompt 在 `lib/generation/prompt.ts`；七类活动结构在 `lib/generation/templates.ts`；JSON Schema 和服务端运行时检查在 `lib/generation/schema.ts`。浏览器只调用同源 `/api/generate`，不接触模型凭据。

`QIANFAN_API_KEY` 只从服务端 `process.env` 读取。真实 `.env` 被 `.gitignore` 忽略；`.env.example` 仅列出变量名。没有 Key 时接口返回 503 和明确配置错误，不伪造模型结果。

当前阶段没有自动识图、RAG、Multi-Agent、模型路由或历史风格学习。结果页接收模型结构化结果；未生成时保留静态示例作为空状态。
