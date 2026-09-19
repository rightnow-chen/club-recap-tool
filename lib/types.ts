export type FormData = {
  type: string;
  name: string;
  date: string;
  time: string;
  place: string;
  organizer: string;
  brief: string;
  flow: string;
  highlights: string;
  guest: string;
  count: string;
  awards: string;
  thanks: string;
  next: string;
  tone: string;
  length: string;
};
export type ImageAsset = {
  image_id: string;
  image_order: number;
  src: string;
  original_key: string;
  filename: string;
  tag: string;
  description: string;
  is_used: boolean;
  is_key: boolean;
  mock: boolean;
};
export type PendingItem = {
  id: string;
  title: string;
  message: string;
  field: keyof FormData;
};
export type GenerationHistory = {
  id: string;
  type: string;
  input: { form: FormData; images: ImageAsset[] };
  output: GenerationResult | null;
  status: "draft" | "generated" | "edited";
  feedback: {
    rating: number | null;
    is_usable_for_review: boolean | null;
    comment: string;
  } | null;
  created_at: string;
  updated_at: string;
};
export type Workspace = {
  schema_version: 2;
  active_id: string | null;
  generation_history: GenerationHistory[];
};
import type { GenerationResult } from "./generation/types";
