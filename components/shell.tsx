"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, BookOpen, History, Sparkles, Check } from "lucide-react";
export function Header() {
  const path = usePathname();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <BookOpen size={22} />
          </span>
          <span>
            ClubRecap <b>AI</b>
          </span>
        </Link>
        <nav aria-label="主导航">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            首页
          </Link>
          <Link
            href="/input"
            aria-current={
              ["/input", "/confirm", "/result"].includes(path)
                ? "page"
                : undefined
            }
          >
            创作工作台
          </Link>
          <Link
            href="/drafts"
            aria-current={path === "/drafts" ? "page" : undefined}
          >
            <History size={16} />
            历史草稿
          </Link>
        </nav>
        <span className="prototype-pill">
          <span />
          本地草稿
        </span>
      </div>
    </header>
  );
}
export function Steps({ active }: { active: number }) {
  return (
    <ol className="steps">
      {["整理图文素材", "确认活动信息", "查看图文初稿"].map((label, i) => (
        <li
          key={label}
          className={
            i + 1 === active ? "current" : i + 1 < active ? "done" : ""
          }
          aria-current={i + 1 === active ? "step" : undefined}
        >
          <span>
            {i + 1 < active ? (
              <Check size={15} />
            ) : (
              String(i + 1).padStart(2, "0")
            )}
          </span>
          {label}
          {i < 2 && <div className="step-line" />}
        </li>
      ))}
    </ol>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
export function MockNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mock-notice">
      <Sparkles size={17} />
      <span>
        {children ||
          "当前为本地草稿，所有示例均为虚构 Mock Data，不调用 AI 模型。"}
      </span>
    </div>
  );
}
export function ForwardLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="button primary">
      {children}
      <ArrowRight size={17} />
    </Link>
  );
}
