"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { emptyForm, mockImages, sampleForm } from "@/lib/mock-data";
import {
  emptyWorkspace,
  parseWorkspace,
  writeWorkspace,
  STORAGE_KEY,
} from "@/lib/draft-storage";
import type {
  FormData,
  ImageAsset,
  Workspace,
  GenerationHistory,
} from "@/lib/types";
import { deleteOriginal } from "@/lib/image-storage";
import type { GenerationResult } from "@/lib/generation/types";
import { applyImageSuggestions } from "@/lib/image-matching";
type State = {
  form: FormData;
  images: ImageAsset[];
  setField: (key: keyof FormData, value: string) => void;
  setImages: (action: React.SetStateAction<ImageAsset[]>) => void;
  loadSample: () => void;
  history: GenerationHistory[];
  activeId: string | null;
  newDraft: () => boolean;
  openDraft: (id: string) => boolean;
  save: () => boolean;
  saveError: string;
  saveState: string;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  generationStatus: "idle" | "generating" | "success" | "failed";
  generationError: string;
  generatedResult: GenerationResult | null;
  updateGeneratedResult: (result: GenerationResult) => void;
  updateFeedback: (feedback: NonNullable<GenerationHistory["feedback"]>) => void;
  deleteDraft: (id: string) => boolean;
  generate: () => Promise<boolean>;
};
const Context = createContext<State | null>(null);
export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const current = useRef(workspace);
  const expected = useRef<string | null>(null);
  const blocked = useRef(false);
  const dirty = useRef(false);
  const [ready, setReady] = useState(false);
  const [saveError, setError] = useState("");
  const [saveState, setSaveState] = useState("尚未创建草稿");
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);
  const [generationStatus, setGenerationStatus] = useState<
    "idle" | "generating" | "success" | "failed"
  >("idle");
  const [generationError, setGenerationError] = useState("");
  const [generatedResult, setGeneratedResult] =
    useState<GenerationResult | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const loaded = parseWorkspace(raw);
      expected.current = raw;
      current.current = loaded;
      setWorkspace(loaded);
      setSaveState(loaded.active_id ? "已恢复本地草稿" : "尚未创建草稿");
    } catch (e) {
      blocked.current = true;
      setError(e instanceof Error ? e.message : "无法读取本地存储。");
      setSaveState("读取失败，未覆盖旧数据");
    }
    setReady(true);
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty.current || uploadingRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const row = workspace.generation_history.find(
      (item) => item.id === workspace.active_id,
    );
    setGeneratedResult(row?.output || null);
  }, [ready, workspace.active_id, workspace.generation_history]);
  function persist(next: Workspace) {
    if (blocked.current) {
      setError("本地草稿读取失败，写入已暂停以保护原始数据。");
      return false;
    }
    try {
      expected.current = writeWorkspace(next, expected.current);
      dirty.current = false;
      setError("");
      setSaveState("已保存到此浏览器");
      return true;
    } catch (e) {
      dirty.current = true;
      setSaveState("尚未保存");
      setError(
        e instanceof DOMException
          ? "浏览器存储不可用或容量不足。当前输入仍保留在页面，请减少图片后重试。"
          : e instanceof Error
            ? e.message
            : "保存失败，请重试。",
      );
      return false;
    }
  }
  function update(next: Workspace) {
    current.current = next;
    setWorkspace(next);
    dirty.current = true;
    return persist(next);
  }
  function makeDraft(
    form: FormData = { ...emptyForm },
    images: ImageAsset[] = [],
  ): GenerationHistory {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      type: form.type,
      input: {
        form: { ...form },
        images: images.map((p, i) => ({ ...p, image_order: i + 1 })),
      },
      output: null,
      status: "draft",
      feedback: null,
      created_at: now,
      updated_at: now,
    };
  }
  function edit(change: (row: GenerationHistory) => GenerationHistory) {
    const state = current.current;
    const row =
      state.generation_history.find((r) => r.id === state.active_id) ||
      makeDraft();
    const next = change(row);
    next.updated_at = new Date().toISOString();
    next.type = next.input.form.type;
    update({
      ...state,
      active_id: next.id,
      generation_history: [
        next,
        ...state.generation_history.filter((r) => r.id !== next.id),
      ].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    });
  }
  function canSwitch() {
    if (uploadingRef.current) {
      setError("图片正在处理，请完成后再切换草稿。");
      return false;
    }
    return !dirty.current || persist(current.current);
  }
  function newDraft() {
    if (!canSwitch() || blocked.current) return false;
    const row = makeDraft();
    setGeneratedResult(null);
    return update({
      ...current.current,
      active_id: row.id,
      generation_history: [row, ...current.current.generation_history],
    });
  }
  function openDraft(id: string) {
    if (!canSwitch() || blocked.current) return false;
    if (!current.current.generation_history.some((r) => r.id === id))
      return false;
    const row = current.current.generation_history.find((item) => item.id === id);
    setGeneratedResult(row?.output || null);
    return update({ ...current.current, active_id: id });
  }
  function deleteDraft(id: string) {
    if (!canSwitch() || blocked.current) return false;
    const row = current.current.generation_history.find((item) => item.id === id);
    if (!row) return false;
    row.input.images.forEach((image) => {
      if (image.original_key) void deleteOriginal(image.original_key);
    });
    const remaining = current.current.generation_history.filter((item) => item.id !== id);
    const nextActive = current.current.active_id === id ? remaining[0]?.id || null : current.current.active_id;
    const next = { ...current.current, active_id: nextActive, generation_history: remaining };
    setGeneratedResult(nextActive ? remaining.find((item) => item.id === nextActive)?.output || null : null);
    return update(next);
  }
  async function generate() {
    if (uploadingRef.current) {
      setGenerationError("图片正在处理，请稍候。");
      return false;
    }
    setGenerationStatus("generating");
    setGenerationError("");
    const activeNow = current.current.generation_history.find(
      (r) => r.id === current.current.active_id,
    );
    if (!activeNow) {
      setGenerationStatus("failed");
      setGenerationError("请先创建并保存草稿。");
      return false;
    }
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_id: activeNow.id,
          form: activeNow.input.form,
          images: activeNow.input.images,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.status !== "success")
        throw new Error(payload.error || "生成失败，请重试。");
      const result = applyImageSuggestions(
        payload.result as GenerationResult,
        activeNow.input.images,
      );
      edit((row) => ({ ...row, output: result, status: "generated" }));
      setGeneratedResult(result);
      setGenerationStatus("success");
      return true;
    } catch (error) {
      setGenerationStatus("failed");
      setGenerationError(
        error instanceof Error ? error.message : "生成失败，请重试。",
      );
      return false;
    }
  }
  function updateGeneratedResult(result: GenerationResult) {
    setGeneratedResult(result);
    edit((row) => ({ ...row, output: result, status: "edited" }));
  }
  function updateFeedback(feedback: NonNullable<GenerationHistory["feedback"]>) {
    edit((row) => ({ ...row, feedback }));
  }
  const active = workspace.generation_history.find(
    (r) => r.id === workspace.active_id,
  );
  if (!ready)
    return (
      <main className="page-wrap" aria-busy="true">
        正在读取本地草稿…
      </main>
    );
  return (
    <Context.Provider
      value={{
        form: active?.input.form || emptyForm,
        images: active?.input.images || [],
        history: workspace.generation_history,
        activeId: workspace.active_id,
        saveError,
        saveState,
        uploading,
        setUploading: (v) => {
          uploadingRef.current = v;
          setUploading(v);
        },
        setField: (key, value) =>
          edit((row) => ({
            ...row,
            input: { ...row.input, form: { ...row.input.form, [key]: value } },
          })),
        setImages: (action) =>
          edit((row) => ({
            ...row,
            input: {
              ...row.input,
              images: (typeof action === "function"
                ? action(row.input.images)
                : action
              ).map((p, i) => ({ ...p, image_order: i + 1 })),
            },
          })),
        loadSample: () => {
          if (!canSwitch() || blocked.current) return;
          const row = makeDraft(sampleForm, mockImages);
          setGeneratedResult(null);
          update({
            ...current.current,
            active_id: row.id,
            generation_history: [row, ...current.current.generation_history],
          });
        },
        newDraft,
        openDraft,
        save: () => {
          if (uploadingRef.current) {
            setError("图片正在处理，完成后会自动保存。");
            return false;
          }
          if (!current.current.active_id) return newDraft();
          return persist(current.current);
        },
        generationStatus,
        generationError,
        generatedResult,
        updateGeneratedResult,
        updateFeedback,
        deleteDraft,
        generate,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePrototype() {
  const state = useContext(Context);
  if (!state) throw new Error("Missing PrototypeProvider");
  return state;
}
