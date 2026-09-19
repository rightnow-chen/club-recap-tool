import type { Metadata } from "next";
import { PrototypeProvider } from "@/components/prototype-provider";
import { Header } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: "ClubRecap AI · 社团活动图文推文生成器",
  description:
    "把活动素材整理成一篇可审核、可编辑、可复制交付的社团公众号推文。",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <PrototypeProvider>
          <a className="skip-link" href="#main">
            跳至主要内容
          </a>
          <Header />
          {children}
          <footer className="site-footer">
            <span>
              ClubRecap AI <i>／</i> 让每场活动，留下一篇好故事。
            </span>
            <span>第 6 阶段 · 本地历史 · 反馈可追踪</span>
          </footer>
        </PrototypeProvider>
      </body>
    </html>
  );
}
