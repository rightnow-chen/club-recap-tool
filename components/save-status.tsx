"use client";
import { usePrototype } from "./prototype-provider";
export function SaveStatus() {
  const { save, saveState, saveError, uploading } = usePrototype();
  return (
    <div className="save-status">
      <div role="status">{uploading ? "正在制作图片预览…" : saveState}</div>
      <button
        type="button"
        className="text-button"
        disabled={uploading}
        onClick={save}
      >
        保存草稿
      </button>
      {saveError && (
        <p className="error" role="alert">
          {saveError}
        </p>
      )}
    </div>
  );
}
