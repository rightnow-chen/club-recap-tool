"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SaveStatus } from "@/components/save-status";
import { missingFields } from "@/lib/form-validation";
import type { FormData } from "@/lib/types";
import { ArrowRight, WandSparkles, Info } from "lucide-react";
import { usePrototype } from "@/components/prototype-provider";
import { Steps, PageHeading, MockNotice } from "@/components/shell";
import {
  Field,
  ChoiceField,
  FormSection,
  groups,
  fieldLabels,
} from "@/components/form-fields";
import { ImageMaterials } from "@/components/image-materials";
import { eventTypes } from "@/lib/event-types";
export default function InputPage() {
  const router = useRouter();
  const { loadSample, form, newDraft, uploading } = usePrototype();
  const [missing, setMissing] = useState<(keyof FormData)[]>([]);
  return (
    <main id="main" className="page-wrap">
      <Steps active={1} />
      <PageHeading
        eyebrow="STEP 01 / MATERIALS"
        title="把现场，装进这篇故事"
        description="不用组织完整的句子，先把你知道的活动信息放在这里。"
      >
        <div className="inline-actions">
          <button
            className="button secondary"
            onClick={() => {
              if (newDraft()) setMissing([]);
            }}
            disabled={uploading}
          >
            新建草稿
          </button>
          <button
            className="button secondary"
            onClick={() => {
              loadSample();
              setMissing([]);
            }}
            disabled={uploading}
          >
            <WandSparkles size={17} />
            新建示例草稿
          </button>
        </div>
      </PageHeading>
      <div className="workspace">
        <aside className="form-sidebar">
          <div className="sidebar-inner">
            <p className="eyebrow">素材目录</p>
            <nav aria-label="输入分组">
              {groups.map((g, i) => (
                <a href={"#" + g.id} key={g.id}>
                  <span>0{i + 1}</span>
                  {g.title}
                  <span className="nav-dot" />
                </a>
              ))}
            </nav>
            <div className="sidebar-tip">
              <Info size={20} />
              <h3>只写你确定的事实</h3>
              <p>
                人物身份、人数与奖项不清楚时，可以留空。真实的细节比华丽的表达更重要。
              </p>
            </div>
            <p className="session-note">
              输入会自动保存到当前浏览器，刷新可恢复。结果页仍为独立示例。
            </p>
          </div>
        </aside>
        <form
          className="form-main"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const errors = missingFields(form);
            setMissing(errors);
            if (errors.length) {
              document.getElementById(errors[0])?.focus();
              return;
            }
            if (uploading) return;
            router.push("/confirm");
          }}
        >
          <MockNotice>
            输入与照片预览会自动保存到本地。带 *
            为必填，选填项留空不影响继续；不调用 AI。
          </MockNotice>
          <SaveStatus />
          {missing.filter((key) => !form[key].trim()).length > 0 && (
            <div className="validation-errors" role="alert">
              <strong>请补充以下必填项</strong>
              <ul>
                {missing
                  .filter((key) => !form[key].trim())
                  .map((key) => (
                    <li key={key}>
                      <a href={"#" + key}>{fieldLabels[key]}不能为空</a>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <FormSection
            id="basics"
            index={1}
            title="活动基础信息"
            description="先介绍一下，这是一场什么样的活动。"
          >
            <ChoiceField name="type" required options={eventTypes} />
            <Field
              name="name"
              required
              placeholder="例如：秋季求职经验分享会"
            />
            <div className="form-grid">
              <Field name="date" required type="date" />
              <Field name="time" placeholder="例如：19:00–21:00" />
              <Field name="place" required placeholder="例如：教学楼 302" />
              <Field
                name="organizer"
                required
                placeholder="填写组织的完整名称"
              />
            </div>
            <Field
              name="brief"
              multiline
              required
              placeholder="活动为什么举办？围绕什么主题？可以直接粘贴已有的活动介绍。"
            />
          </FormSection>
          <FormSection
            id="process"
            index={2}
            title="活动过程"
            description="沿着时间顺序，回想现场发生的事。"
          >
            <Field
              name="flow"
              required
              multiline
              placeholder="例如：签到 → 嘉宾分享 → 互动问答 → 合影"
            />
            <Field
              name="highlights"
              multiline
              placeholder="记录一个具体的环节、问题或值得留下的瞬间。"
            />
          </FormSection>
          <FormSection
            id="photos"
            index={3}
            title="图片素材"
            description="用照片和一句图注，让活动现场更清晰。"
          >
            <ImageMaterials />
          </FormSection>
          <FormSection
            id="people"
            index={4}
            title="人物/成果"
            description="填写已经确认的信息，未知内容可以留空。"
          >
            <Field
              name="guest"
              multiline
              placeholder="例如：李同学，2024 届毕业生"
            />
            <Field
              name="count"
              type="number"
              placeholder="请填写实际参与人数，未知可留空"
            />
            <Field
              name="awards"
              multiline
              placeholder="填写具体奖项、获奖名单或有依据的活动成果。"
            />
          </FormSection>
          <FormSection
            id="closing"
            index={5}
            title="收尾"
            description="为这场活动留下一句感谢，或下一次相见的约定。"
          >
            <Field
              name="thanks"
              multiline
              placeholder="例如：分享嘉宾、参与筹备的工作人员"
            />
            <Field
              name="next"
              multiline
              placeholder="填写已确定的后续安排或行动号召，没有则留空。"
            />
          </FormSection>
          <FormSection
            id="preferences"
            index={6}
            title="生成偏好"
            description="选择适合这次活动的表达方式。"
          >
            <ChoiceField
              name="tone"
              required
              options={["正式纪实", "青春温暖"]}
            />
            <ChoiceField
              name="length"
              options={["默认 600–900 字", "精简版"]}
            />
          </FormSection>
          <div className="form-actions">
            <span>下一步：核对素材与待确认信息</span>
            <button
              className="button primary"
              type="submit"
              disabled={uploading}
            >
              检查信息
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
