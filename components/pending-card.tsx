import Link from "next/link";
import { CircleAlert, ArrowUpRight } from "lucide-react";
import { mockPending } from "@/lib/mock-data";
export function PendingCard() {
  return (
    <section className="pending-card">
      <div className="pending-heading">
        <CircleAlert size={20} />
        <h2>待确认项</h2>
        <span>Mock 示例</span>
      </div>
      <p>下面展示的是示例待确认状态，不是对当前输入的自动核验。</p>
      {mockPending.map((item) => (
        <div className="pending-item" key={item.id}>
          <span className="amber-dot" />
          <div>
            <h3>{item.title}</h3>
            <p>{item.message}</p>
            <Link
              href={"/input#" + (item.field === "count" ? "people" : "closing")}
            >
              返回补充
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      ))}
    </section>
  );
}
