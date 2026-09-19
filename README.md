# ClubRecap AI · 第 2 阶段

本阶段实现真实输入、图片素材管理和 localStorage 草稿。未接 AI、Supabase、登录或后台。第一阶段结果页仍为独立静态示例，不写入草稿输出。

## 运行

```sh
npm install
npm run dev
```

访问 http://127.0.0.1:3000 。生产预览使用 `npm run build` 后 `npm start`。不要同时启动两种服务。

## 数据在哪里

表单在编辑时由 React 状态驱动。每次修改会同步将整个工作区写入当前浏览器的 localStorage，键为 `clubrecap.workspace.v2`。只有 `setItem` 成功后才显示“已保存到此浏览器”。页面提供“保存草稿”按钮用于手动保存或失败后重试，未填必填项也可保存。

工作区结构：

```json
{
  "schema_version": 2,
  "active_id": "当前草稿 UUID",
  "generation_history": [
    {
      "id": "草稿 UUID",
      "type": "讲座 / 培训 / 分享",
      "input": {
        "form": {
          "type": "讲座 / 培训 / 分享",
          "name": "活动名称",
          "date": "2026-09-18",
          "time": "19:00–21:00",
          "place": "教学楼 302",
          "organizer": "职业发展协会",
          "brief": "活动简介/目的",
          "flow": "活动流程",
          "highlights": "现场亮点",
          "guest": "嘉宾姓名与身份",
          "count": "60",
          "awards": "获奖名单/成果",
          "thanks": "致谢对象",
          "next": "后续预告/CTA",
          "tone": "青春温暖",
          "length": "默认 600–900 字"
        },
        "images": [
          {
            "image_id": "图片 UUID",
            "image_order": 1,
            "tag": "分享",
            "description": "嘉宾讲解简历优化方法",
            "is_used": true,
            "is_key": true,
            "src": "data:image/jpeg;base64,...",
            "filename": "photo.png",
            "mock": false
          }
        ]
      },
      "output": null,
      "status": "draft",
      "feedback": null,
      "created_at": "2026-09-18T08:00:00.000Z",
      "updated_at": "2026-09-18T08:00:00.000Z"
    }
  ]
}
```

输入值保持可编辑字符串，包括日期和人数；空值用空字符串。`type` 与 `input.form.type` 同步。`created_at` 创建后不变，修改时更新 `updated_at`。本阶段没有生成行为，因此 `output`、`feedback` 为 null，状态始终为 draft。

## 图片存的是什么

支持 JPG / PNG / WebP 多选，单张原图上限 20 MB。图片会在浏览器本地生成缩略图供列表展示，同时原始 File 保存到 IndexedDB；缩略图不是图文稿的最终图片。

localStorage 存储图片元数据、`original_key` 和缩略图字符串；IndexedDB 的 `clubrecap.images.v1/originals` 对象仓按 `original_key` 保存原始 File/Blob。不上传原图，也不把临时 blob URL 写入 localStorage。后续图文稿和导出链路应按 `original_key` 读取原图。

刷新后可恢复缩略图、描述、标签、使用开关、重点标记和顺序；原图仍在 IndexedDB 中。`image_id` 不因排序改变；上移、下移、删除后按显示顺序更新 `image_order`（从 1 开始）。原始照片也请自行保留，浏览器本地存储不是备份系统。

## 恢复与容量

页面初始化先读取 localStorage 并校验结构，再通过 `active_id` 恢复最后打开的草稿。不会先用空表单覆盖旧数据。历史页显示真实记录，按修改时间倒序排列，搜索和打开记录均使用这份数据。

支持至少 10 条草稿，未设自动淘汰机制；第 11 条不会删除第 1 条。容量取决于浏览器与图片数量，应用为工作区设置 220 万字符的保守预算。超预算或浏览器配额不足时不覆盖旧快照，保留当前内存输入并提示“尚未保存”；减少当前图片后可重试。若保存失败，切换/新建草稿会被暂停，防止丢失当前修改。未保存或图片处理中离开页面时请求浏览器提示。

本地数据只属于当前浏览器和 origin（协议、主机、端口）。换浏览器、把 127.0.0.1 改为 localhost、换端口，都会进入不同存储空间。清除站点数据会删除草稿；没有云端备份。

损坏或不兼容的数据不会被静默清空，读取失败后暂停写入并保留原始字符串。写入前比较上次读取的快照；另一标签页更改了草稿时拒绝覆盖并提示，不进行自动合并。确认另一个标签页的版本后，再刷新读取最新记录。

## 字段与阶段边界

依据用户提供 PRD 第 5、6、8 节。保留用户后续确认的七类活动，不增加其他表单字段。所有字段支持填写、修改、保存与恢复，包括篇幅偏好。

必填：活动类型、名称、日期、地点、主办/承办方、简介/目的、流程、文风。点击“检查信息”时逐项提示空值（包括纯空格），并聚焦第一个缺失项。选填字段留空不阻断，无图也可继续。没有身份推断、冲突识别、人数核验等第五阶段高风险规则。

“新建示例草稿”会创建独立记录，不覆盖当前草稿。“使用示例图片”追加素材，不替换已有照片。结果页的固定示例不写入 output，也不改变草稿状态。

## 手动测试

1. 打开 `/drafts`：首次使用显示空状态。点击“创建第一份草稿”。
2. 在 `/input` 不填写直接点“检查信息”：显示缺失必填项；仍能保存草稿。
3. 填写所有字段，切换活动类型、文风、篇幅；看到保存成功后刷新，检查所有输入仍在。
4. 多选 JPG、PNG、WebP 各一张。修改标签与描述、取消使用、设置重点、上移/下移；刷新后检查图片和标注顺序不变。
5. 删除一张照片，再刷新，确认其已移除。试上传不支持的格式或损坏图片，确认错误提示且原有图片仍在。
6. 点击“检查信息”进入 `/confirm`，刷新检查真实摘要；返回补充修改后再次确认。
7. 新建另一份草稿，只填写必填项；所有选填项和图片留空，应该能进入确认页。
8. 连续创建 11 条不同名称草稿，在 `/drafts` 搜索并打开第 1 条，验证原有文字、图片与元数据仍在；修改后该条移到列表顶部。
9. 关闭标签页，在同一浏览器用同一地址重新打开，恢复最后打开的草稿。
10. 浏览 `/result` 固定示例，再返回草稿，验证没有生成状态或假输出。

## 自动检查

```sh
npm run check
npm run build
# 先运行服务。浏览器检查默认使用本机 Codex 的 Playwright 与 Edge。
# 其他环境可用 PLAYWRIGHT_MODULE 指定 Playwright 模块路径。
node tests/prototype.browser.cjs
```

浏览器测试覆盖全部字段恢复、三种图片格式、排序/标记/删除恢复、11 条草稿、配额写入失败及重试、损坏数据保护、跨标签页冲突、四种响应式宽度。测试使用隔离浏览器上下文，不修改用户当前浏览器的草稿。

## 主要文件

- `components/prototype-provider.tsx`：共享编辑状态、创建/打开/自动保存及恢复。
- `lib/types.ts`：统一 generation_history、表单、图片和工作区结构。
- `lib/draft-storage.ts`：localStorage 读写、结构验证、容量与多标签页保护。
- `lib/image-preview.ts`：图片格式检查、本地解码与预览图压缩。
- `lib/form-validation.ts`：仅必填空值检查。
- `components/image-materials.tsx`：图片选择、标注、排序、删除。
- `components/save-status.tsx`：真实保存状态和失败反馈。
- `app/drafts/page.tsx`：真实本地草稿列表。

## 第 3 阶段生成接口

生成链路见 [`docs/generation-flow.md`](docs/generation-flow.md)。服务端接口为 `POST /api/generate`，使用 ERNIE 5.1 的 `https://qianfan.baidubce.com/v2/chat/completions`。请求只发送整理后的文字上下文和图片元数据，不发送图片内容。

配置本地环境：复制 `.env.example` 为 `.env.local`，填入服务端变量 `QIANFAN_API_KEY`，可选设置 `QIANFAN_MODEL=ernie-5.1`。`.env.local` 被 Git 忽略，客户端没有 `NEXT_PUBLIC` 凭据。未配置 Key 时接口返回明确失败，不显示假结果。

旧版根目录 HTML、`src/`、`server.mjs` 不参与 Next.js 运行。第 3 阶段只实现服务端生成、Prompt 模块、七类结构模板、Schema 校验和结果接入；不进入第 4 阶段。
