"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FileText,
  Search,
  Images,
  Clock3,
} from "lucide-react";
import { PageHeading, MockNotice } from "@/components/shell";
import { SaveStatus } from "@/components/save-status";
import { usePrototype } from "@/components/prototype-provider";
export default function DraftsPage() {
  const [search, setSearch] = useState("");
  const { history, activeId, newDraft, openDraft, deleteDraft, uploading } = usePrototype();
  const router = useRouter();
  const rows = history.filter((d) =>
    (d.input.form.name || "未命名活动").includes(search.trim()),
  );
  return (
    <main id="main" className="page-wrap drafts-page">
      <PageHeading
        eyebrow="YOUR CAMPUS STORIES"
        title="每一份记录，都值得接着写"
        description="这里保存着此浏览器中的真实活动草稿，按最近修改时间排列。"
      >
        <button
          className="button primary"
          disabled={uploading}
          onClick={() => {
            if (newDraft()) router.push("/input");
          }}
        >
          <Plus size={18} />
          新建草稿
        </button>
      </PageHeading>
      <MockNotice>
        草稿仅保存在当前浏览器与访问地址下。支持至少 10
        条，不会自动淘汰旧草稿；清除站点数据会删除它们。
      </MockNotice>
      <SaveStatus />
      <div className="draft-toolbar">
        <span>全部草稿 · {history.length} 条</span>
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="搜索草稿"
            placeholder="搜索活动名称"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="draft-grid">
        {rows.map((draft) => (
          <article className="draft-card" key={draft.id}>
            <div className="draft-cover">
              {draft.input.images[0] ? (
                <img
                  src={draft.input.images[0].src}
                  alt={
                    draft.input.images[0].description ||
                    draft.input.images[0].filename
                  }
                />
              ) : (
                <FileText size={48} strokeWidth={1} />
              )}
              <span className="status-badge">
                草稿{draft.id === activeId ? " · 当前" : ""}
              </span>
            </div>
            <div className="draft-body">
              <span className="eyebrow">{draft.type}</span>
              <h2>{draft.output?.titles?.[0] || draft.input.form.name || "未命名活动"}</h2>
              <p>
                <Images size={15} />
                {draft.input.images.length} 张素材<span>·</span>{draft.status === "draft" ? "草稿" : draft.status === "edited" ? "已编辑" : "已生成"}
              </p>
              <div className="draft-card-bottom">
                <span>
                  <Clock3 size={14} />
                  创建 {new Date(draft.created_at).toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>更新 {new Date(draft.updated_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="history-actions">
                {draft.output && <button className="button secondary" disabled={uploading} onClick={() => { if (openDraft(draft.id)) router.push("/result"); }}>查看</button>}
                <button className="button secondary" disabled={uploading} onClick={() => { if (openDraft(draft.id)) router.push("/input"); }}>{draft.output ? "继续编辑" : "恢复"}</button>
                <button className="button danger" disabled={uploading} onClick={() => { if (window.confirm("确定删除这份记录吗？")) deleteDraft(draft.id); }}>删除</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {rows.length === 0 && (
        <div className="empty-state">
          <FileText size={32} />
          <h2>{history.length ? "没有匹配的草稿" : "还没有活动草稿"}</h2>
          <p>
            {history.length
              ? "试试其他活动名称。"
              : "开始填写后，活动信息会自动保存在这里。"}
          </p>
          {history.length > 0 ? (
            <button className="button secondary" onClick={() => setSearch("")}>
              清除搜索
            </button>
          ) : (
            <button
              className="button primary"
              onClick={() => {
                if (newDraft()) router.push("/input");
              }}
            >
              创建第一份草稿
            </button>
          )}
        </div>
      )}
      <p className="drafts-footnote">
        共 {rows.length} 条记录 · 本地保存 · 本阶段不接 AI
      </p>
    </main>
  );
}
