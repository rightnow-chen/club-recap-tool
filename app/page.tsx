"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Images,
  ListChecks,
  FileText,
  Sparkles,
  Check,
  History,
  MoveUpRight,
} from "lucide-react";
import { usePrototype } from "@/components/prototype-provider";
export default function Home() {
  const { loadSample } = usePrototype();
  return (
    <main id="main" className="home">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-line" />
            为校园里的每一次相聚
          </div>
          <p className="product-name">社团活动图文推文生成器</p>
          <h1>
            活动结束了，
            <br />
            好故事<span>才刚开始。</span>
          </h1>
          <p className="hero-description">
            上传活动照片，补充几行说明，
            <br />
            把零散素材整理成一篇可审核的社团公众号推文。
          </p>
          <div className="hero-actions">
            <Link className="button primary large" href="/input">
              开始填写
              <ArrowRight size={19} />
            </Link>
            <Link className="text-link" href="/drafts">
              <History size={17} />
              历史草稿
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="hero-note">
            <span className="small-dot" />第 2 阶段 · 本地草稿
            <span>无需登录 · 刷新可恢复</span>
          </div>
        </div>
        <div className="hero-art" aria-label="图文初稿示意">
          <div className="art-orbit" />
          <div className="floating-photo">
            <img src="/images/sharing.svg" alt="嘉宾分享场景示意插画" />
            <span>图 02 · 嘉宾分享</span>
          </div>
          <div className="article-preview">
            <div className="preview-top">
              <span className="mini-icon">
                <FileText size={16} />
              </span>
              <span>一篇校园故事</span>
              <span className="green-tag">示例初稿</span>
            </div>
            <div className="preview-rule" />
            <small>活动回顾 / AUTUMN 2026</small>
            <h2>
              把求职路上的经验，
              <br />
              分享给正在出发的你
            </h2>
            <p>
              从一段经历，到一次面对面的交流。
              <br />
              记录现场，也记录成长的每一步。
            </p>
            <img
              className="preview-image"
              src="/images/group.svg"
              alt="社团活动合影场景示意插画"
            />
            <div className="fake-lines">
              <i />
              <i />
              <i />
            </div>
            <div className="preview-footer">
              <span>图文对应</span>
              <span>结构清晰</span>
              <span>便于核对</span>
            </div>
          </div>
          <div className="floating-label">
            <span>
              <Check size={18} />
            </span>
            <div>
              零散素材，有了清晰结构<small>从活动现场，到文字里的回响</small>
            </div>
          </div>
          <Sparkles className="art-spark" size={28} />
        </div>
      </section>
      <section className="how-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A LITTLE HELP, A BETTER STORY</p>
            <h2>三步，让一场活动被好好记录</h2>
          </div>
          <Link href="/input" onClick={loadSample} className="text-link">
            用示例素材体验
            <MoveUpRight size={17} />
          </Link>
        </div>
        <div className="how-grid">
          {[
            {
              Icon: Images,
              title: "放入素材",
              description: "活动简介、现场照片与几句图注，都是故事的起点。",
            },
            {
              Icon: ListChecks,
              title: "核对信息",
              description: "确认日期、人物与关键事实，让每一句表达都有依据。",
            },
            {
              Icon: FileText,
              title: "查看初稿",
              description: "标题、段落与图片有序呈现，方便接下来的人工审核。",
            },
          ].map(({ Icon, title, description }, i) => (
            <article className="how-card" key={title}>
              <div className="how-top">
                <span className="feature-icon">
                  <Icon size={22} />
                </span>
                <span>0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <div className="home-bottom">
        <span>把时间留给活动，把记录交给 ClubRecap。</span>
        <span>分享、展演、公益、会议、典礼、团建、研学 · 七类活动</span>
      </div>
    </main>
  );
}
