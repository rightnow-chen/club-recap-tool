# ClubRecap AI · 社团活动图文推文生成器

ClubRecap AI 面向高校社团和校园组织，把活动信息、现场图片和补充说明整理成一篇可审核、可编辑、可复制交付的公众号推文初稿。

当前版本已完成第 1—6 阶段：输入系统、图片素材管理、AI 生成、可信度检查、图文匹配、结果编辑、复制交付、历史记录、用户反馈和移动端适配。项目不包含登录、会员、支付、数据库、后台或公众号自动发布。

## 运行

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:3000`。

生产构建和启动：

```bash
npm run check
npm run build
npm run start
```

## AI 环境变量

复制 `.env.example` 为 `.env.local`，填写服务端变量：

```env
QIANFAN_API_KEY=
QIANFAN_MODEL=ernie-5.1
```

`QIANFAN_API_KEY` 只在服务端读取，不能改成 `NEXT_PUBLIC_QIANFAN_API_KEY`，也不能提交 `.env.local`。`.env.local` 已被 `.gitignore` 忽略；Vercel 部署时需要在项目设置中配置同名环境变量。

## 用户流程

1. 首页进入输入页，创建或恢复一份草稿。
2. 填写活动类型、名称、日期、地点、主办方、活动简介、流程和文风等字段。
3. 上传 JPG、PNG 或 WebP 图片，填写标签和描述，设置是否使用、是否为重点图片，并调整顺序。
4. 在信息确认页检查输入摘要和待确认项。
5. 服务端把输入整理为事实、活动过程、图片上下文、生成偏好、缺失信息和禁止推断内容，再调用 Qianfan 模型。
6. 生成结果经过 JSON 解析、结构检查、图片建议匹配和事实风险检查后进入结果页。
7. 用户可以修改标题、摘要、正文、图注和图片位置，填写反馈，并复制带有图片占位符的全文。
8. 草稿、生成结果、编辑内容和反馈保存在当前浏览器，可在历史页查看、恢复、继续编辑或删除。

## 页面

- `/`：产品介绍、开始填写、历史草稿入口。
- `/input`：活动字段和图片素材输入。
- `/confirm`：输入摘要、待确认项和生成入口。
- `/result`：标题候选、文章编辑、图文匹配、反馈和复制全文。
- `/drafts`：历史记录、查看、恢复、继续编辑和删除。
- `/api/generate`：服务端 AI 生成接口。

## 数据保存

表单、图片元数据、生成结果和反馈保存在 localStorage，键为 `clubrecap.workspace.v2`。原始图片文件额外保存在浏览器 IndexedDB，localStorage 只保存缩略图和图片元数据，不上传图片到服务器。

每条历史记录包含：

```text
id
type
input
output
status
feedback
created_at
updated_at
```

失败时接口会保留当前表单和图片信息，用户可以修改后重新生成。浏览器清除站点数据、切换浏览器、切换域名或端口后，本地草稿不会自动迁移。

## 生成质量控制

生成前检查日期、地点、主办方、嘉宾身份、参与人数、奖项和成果等高风险字段，并把缺失字段写入 `pending_confirmation`。

规则明确限制：没有人数就不写人数规模，没有嘉宾身份就不补职称履历，没有奖项就不写奖项名单，没有明确成果就不写未经确认的结论。生成后还会检查文章结构、人数、奖项、身份、结论性表述和图片引用。

## 测试

```bash
npm run check
npm run build
npm run test:phase5
```

`npm run test:phase5` 默认测试非法 JSON、必填字段缺失和失败输入保留。要执行真实模型案例，先启动开发服务器，再运行：

```bash
$env:PHASE5_RUN_LLM='1'; npm run test:phase5
```

人工质量评测记录见 [docs/phase5-quality-evaluation.md](docs/phase5-quality-evaluation.md)。生成链路说明见 [docs/generation-flow.md](docs/generation-flow.md)。

## Vercel 部署

在 Vercel 中选择 GitHub 仓库 `rightnow-chen/club-recap-tool` 的 `main` 分支，Framework Preset 选择 Next.js，Build Command 使用 `npm run build`。在 Vercel 项目环境变量中配置 `QIANFAN_API_KEY` 和 `QIANFAN_MODEL`，不要上传 `.env.local`。

发布后应走查完整链路：输入、图片上传、图片描述、信息确认、AI 生成、结果编辑、复制全文、反馈保存、历史记录恢复，以及 375px、768px、1440px 三种宽度。

## 旧版文件

根目录旧版 HTML、`src/`、`server.mjs`、旧版测试和辅助脚本不参与当前 Next.js 应用运行，也没有进入 GitHub 的主提交。当前线上代码以 `app/`、`components/`、`lib/` 和 `public/` 为准。

