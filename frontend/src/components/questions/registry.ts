import type { IconName } from "../icons";
import type { QuestionType } from "@/lib/types";

/** One entry per question type: how it's labelled, drawn and grouped in the builder.
 *  Adding a type = one entry here + one Body component + one backend validator. */
export interface TypeInfo {
  label: string;
  icon: IconName;
  tile: string; // Tailwind background class, colours measured from Typeform
  group: "Contact info" | "Choice" | "Rating & ranking" | "Text & Video" | "Other";
  autoAdvance: boolean; // single-tap answers move on by themselves
}

export const TYPES: Record<QuestionType, TypeInfo> = {
  email: { label: "Email", icon: "email", tile: "bg-tile-contact", group: "Contact info", autoAdvance: false },
  multiple_choice: { label: "Multiple Choice", icon: "choice", tile: "bg-tile-choice", group: "Choice", autoAdvance: true },
  dropdown: { label: "Dropdown", icon: "dropdown", tile: "bg-tile-choice", group: "Choice", autoAdvance: true },
  yes_no: { label: "Yes/No", icon: "yesNo", tile: "bg-tile-choice", group: "Choice", autoAdvance: true },
  rating: { label: "Rating", icon: "star", tile: "bg-tile-rating", group: "Rating & ranking", autoAdvance: true },
  long_text: { label: "Long Text", icon: "longText", tile: "bg-tile-text", group: "Text & Video", autoAdvance: false },
  short_text: { label: "Short Text", icon: "shortText", tile: "bg-tile-text", group: "Text & Video", autoAdvance: false },
  number: { label: "Number", icon: "number", tile: "bg-tile-other", group: "Other", autoAdvance: false },
  file_upload: { label: "File Upload", icon: "upload", tile: "bg-tile-other", group: "Other", autoAdvance: false },
};

/** Shown in the add-content dialog but not buildable — the brief's "Coming soon" items. */
export const COMING_SOON: { label: string; icon: IconName; tile: string; group: TypeInfo["group"] }[] = [
  { label: "Phone Number", icon: "phone", tile: "bg-tile-contact", group: "Contact info" },
  { label: "Picture Choice", icon: "eye", tile: "bg-tile-choice", group: "Choice" },
  { label: "Opinion Scale", icon: "chart", tile: "bg-tile-rating", group: "Rating & ranking" },
  { label: "Ranking", icon: "longText", tile: "bg-tile-rating", group: "Rating & ranking" },
  { label: "Video and Audio", icon: "play", tile: "bg-tile-text", group: "Text & Video" },
  { label: "Date", icon: "clock", tile: "bg-tile-other", group: "Other" },
  { label: "Payment", icon: "lock", tile: "bg-tile-other", group: "Other" },
  { label: "Signature", icon: "file", tile: "bg-tile-other", group: "Other" },
];

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
