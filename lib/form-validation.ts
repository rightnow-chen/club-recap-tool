import type { FormData } from "./types";
export const requiredFields: (keyof FormData)[] = [
  "type",
  "name",
  "date",
  "place",
  "organizer",
  "brief",
  "flow",
  "tone",
];
export function missingFields(form: FormData) {
  return requiredFields.filter((key) => !form[key].trim());
}
