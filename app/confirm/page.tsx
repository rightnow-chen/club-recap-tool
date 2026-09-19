"use client";
import Link from "next/link";
import { ArrowLeft, Images, ClipboardCheck } from "lucide-react";
import { usePrototype } from "@/components/prototype-provider";
import {
  Steps,
  PageHeading,
  MockNotice,
  ForwardLink,
} from "@/components/shell";
import { groups, fieldLabels } from "@/components/form-fields";
import { PendingCard } from "@/components/pending-card";
import { SaveStatus } from "@/components/save-status";
import { missingFields } from "@/lib/form-validation";
import { GenerateButton } from "@/components/generate-button";
export default function ConfirmPage() {
  const { form, images } = usePrototype();
  return (
    <main id="main" className="page-wrap">
      <Steps active={2} />
      <PageHeading
        eyebrow="STEP 02 / REVIEW"
        title="在动笔前，再看一眼"
        description="确认活动信息，让这篇回顾从准确的事实开始。"
      />
      <MockNotice>
        摘要展示当前草稿，输入与图片已接入本地保存。此阶段不生成文章；待确认项与结果仍为独立示例。
      </MockNotice>
      <SaveStatus />
      <div className="review-layout">
        <div className="panel summary-panel">
          <div className="panel-heading">
            <span className="feature-icon">
              <ClipboardCheck size={22} />
            </span>
            <div>
              <h2>你的活动素材</h2>
              <p>成功保存后，返回补充或刷新页面均可恢复。</p>
            </div>
          </div>
          {groups.map((group) => (
            <section className="summary-group" key={group.id}>
              <div className="summary-group-heading">
                <h3>{group.title}</h3>
                <Link href={"/input#" + group.id}>修改</Link>
              </div>
              {group.id === "photos" ? (
                <>
                  <p className="photo-summary">
                    <Images size={16} />
                    {images.length} 张素材 ·{" "}
                    {images.filter((p) => p.is_used).length} 张已选择使用
                  </p>
                  <div className="summary-images">
                    {images.map((p) => (
                      <figure key={p.image_id}>
                        <img src={p.src} alt={p.description || p.filename} />
                        <figcaption>
                          图 {p.image_order} · {p.tag || "未标注"}
                          {!p.is_used ? " · 不使用" : ""}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  {images.length === 0 && <p className="muted">尚未添加图片</p>}
                </>
              ) : (
                <dl>
                  {group.fields.map((key) => (
                    <div key={key}>
                      <dt>{fieldLabels[key]}</dt>
                      <dd className={!form[key] ? "empty-value" : ""}>
                        {form[key] || "未填写"}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
        </div>
        <aside>
          <PendingCard />
          <div className="side-note">
            <h3>接下来会看到什么？</h3>
            <p>3 个候选标题、摘要、完整文章分块与图片卡片。</p>
            <p>
              “查看结果页示例”仅预览第一阶段的固定文章，不写入本地草稿的
              output。
            </p>
            {missingFields(form).length > 0 && (
              <p className="error">当前还有必填信息未填写，请返回补充。</p>
            )}
          </div>
        </aside>
      </div>
      <div className="page-actions">
        <Link className="button secondary" href="/input">
          <ArrowLeft size={17} />
          返回补充
        </Link>
        {missingFields(form).length === 0 ? (
          <GenerateButton />
        ) : (
          <ForwardLink href="/input">返回补充必填项</ForwardLink>
        )}
      </div>
    </main>
  );
}
