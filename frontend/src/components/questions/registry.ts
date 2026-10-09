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

/** Everything in Typeform's "Add form elements" dialog, in its order and columns. Entries with a `type`
 *  (or a screen `action`) are built; the rest are the brief's "Coming soon" placeholders. */
export interface Element {
  label: string;
  icon: IconName;
  tile: string;
  type?: QuestionType;
  action?: "welcome" | "end";
  premium?: boolean; // Typeform marks these as paid
}
const contact = (label: string, icon: IconName, type?: QuestionType): Element => ({ label, icon, tile: "bg-tile-contact", type });
const choice = (label: string, icon: IconName, type?: QuestionType): Element => ({ label, icon, tile: "bg-tile-choice", type });
const rating = (label: string, icon: IconName, type?: QuestionType): Element => ({ label, icon, tile: "bg-tile-rating", type });
const text = (label: string, icon: IconName, type?: QuestionType, premium = false): Element => ({ label, icon, tile: "bg-tile-text", type, premium });
const other = (label: string, icon: IconName, type?: QuestionType, premium = false): Element => ({ label, icon, tile: "bg-tile-other", type, premium });
const screen = (label: string, icon: IconName, action?: Element["action"], premium = false): Element => ({ label, icon, tile: "bg-tile-screen", action, premium });

export const CATALOGUE: { title?: string; items: Element[] }[][] = [
  [
    { title: "Contact info", items: [contact("Contact Info", "contact"), contact("Email", "email", "email"), contact("Phone Number", "phoneCall"), contact("Address", "pin"), contact("Website", "link")] },
    { title: "Text & Video", items: [text("Long Text", "longText", "long_text"), text("Short Text", "shortText", "short_text"), text("Video and Audio", "videoBox", undefined, true), text("Clarify with AI", "clarify", undefined, true), text("FAQ with AI", "faq", undefined, true)] },
  ],
  [
    { title: "Choice", items: [choice("Multiple Choice", "choice", "multiple_choice"), choice("Dropdown", "dropdown", "dropdown"), choice("Picture Choice", "image"), choice("Yes/No", "yesNo", "yes_no"), choice("Legal", "legal"), choice("Checkbox", "checkbox")] },
    { title: "Other", items: [other("Number", "number", "number"), other("Date", "calendar"), other("Signature", "signature", undefined, true), other("Payment", "card", undefined, true), other("File Upload", "fileUp", "file_upload", true), other("Scheduler", "scheduler")] },
  ],
  [
    { title: "Rating & ranking", items: [rating("Net Promoter Score®", "gauge"), rating("Opinion Scale", "chart"), rating("Rating", "star", "rating"), rating("Ranking", "ranking"), rating("Matrix", "matrix")] },
    { items: [screen("Welcome Screen", "welcome", "welcome"), screen("Partial Submit Point", "funnel", undefined, true), screen("Statement", "quote"), screen("Question Group", "group"), screen("End Screen", "end", "end"), screen("Redirect to URL", "redirect", undefined, true)] },
  ],
];

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
