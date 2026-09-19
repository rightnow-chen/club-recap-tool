"use client";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { usePrototype } from "./prototype-provider";
export function GenerateButton() {
  const router = useRouter();
  const { generate, generationStatus, generationError } = usePrototype();
  const busy = generationStatus === "generating";
  return (
    <div className="generate-action">
      <button
        className="button primary"
        disabled={busy}
        onClick={async () => {
          if (await generate()) router.push("/result");
        }}
      >
        {busy ? (
          <>
            <LoaderCircle className="spin" size={17} />
            正在生成
          </>
        ) : (
          <>
            生成图文初稿
            <ArrowRight size={18} />
          </>
        )}
      </button>
      {generationError && (
        <p className="error" role="alert">
          {generationError}
          <br />
          <span>输入与图片已保留。模型生成可能需要几十秒，请不要连续点击；稍后可以重试。</span>
        </p>
      )}
    </div>
  );
}
