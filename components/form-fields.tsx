"use client";
import { usePrototype } from "./prototype-provider";
import type { FormData } from "@/lib/types";
export const fieldLabels: Record<keyof FormData, string> = {
  type: "活动类型",
  name: "活动名称",
  date: "活动日期",
  time: "活动时间",
  place: "活动地点",
  organizer: "主办/承办方",
  brief: "活动简介/目的",
  flow: "活动流程",
  highlights: "现场亮点",
  guest: "嘉宾姓名与身份",
  count: "参与人数",
  awards: "获奖名单/成果",
  thanks: "致谢对象",
  next: "后续预告/CTA",
  tone: "文风",
  length: "篇幅",
};
export const groups: {
  id: string;
  title: string;
  fields: (keyof FormData)[];
}[] = [
  {
    id: "basics",
    title: "活动基础信息",
    fields: ["type", "name", "date", "time", "place", "organizer", "brief"],
  },
  { id: "process", title: "活动过程", fields: ["flow", "highlights"] },
  { id: "photos", title: "图片素材", fields: [] },
  { id: "people", title: "人物/成果", fields: ["guest", "count", "awards"] },
  { id: "closing", title: "收尾", fields: ["thanks", "next"] },
  { id: "preferences", title: "生成偏好", fields: ["tone", "length"] },
];
export function FormSection({
  index,
  title,
  description,
  id,
  children,
}: {
  index: number;
  title: string;
  description: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel form-section" id={id}>
      <div className="panel-heading">
        <span className="section-number">0{index}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
export function Field({
  name,
  required = false,
  multiline = false,
  placeholder = "",
  type = "text",
}: {
  name: keyof FormData;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
  type?: string;
}) {
  const { form, setField } = usePrototype();
  const common = {
    id: name,
    name,
    value: form[name],
    required,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setField(name, e.target.value),
  };
  return (
    <div className="field">
      <label htmlFor={name}>
        {fieldLabels[name]}{" "}
        {required ? <em>*</em> : <span className="optional">选填</span>}
      </label>
      {multiline ? (
        <textarea {...common} rows={3} />
      ) : (
        <input
          {...common}
          type={type}
          min={type === "number" ? 1 : undefined}
          step={type === "number" ? 1 : undefined}
        />
      )}
    </div>
  );
}
export function ChoiceField({
  name,
  options,
  required = false,
}: {
  name: "type" | "tone" | "length";
  options: string[];
  required?: boolean;
}) {
  const { form, setField } = usePrototype();
  return (
    <fieldset className="field" id={name} tabIndex={-1}>
      <legend>
        {fieldLabels[name]} {required && <em>*</em>}
      </legend>
      <div
        className={
          name === "type" ? "choice-grid event-type-grid" : "choice-grid"
        }
      >
        {options.map((option) => (
          <label
            className={"choice " + (form[name] === option ? "selected" : "")}
            key={option}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={form[name] === option}
              onChange={() => setField(name, option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
