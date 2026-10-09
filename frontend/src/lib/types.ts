export type QuestionType =
  | "short_text" | "long_text" | "multiple_choice" | "dropdown"
  | "email" | "number" | "yes_no" | "rating" | "file_upload";

export type Operator = "is" | "is_not" | "lt" | "gt" | "always";

export interface Theme {
  id: number;
  name: string;
  is_gallery: boolean;
  font: string;
  question_color: string;
  answer_color: string;
  button_color: string;
  button_text_color: string;
  background_color: string;
  background_image_url: string | null;
  corner_radius: "square" | "rounded" | "pill";
}

export interface Option { id: number; label: string; position: number }

export interface LogicRule {
  id?: number;
  operator: Operator;
  value: string | null;
  option_id: number | null;
  jump_to_question_id: number | null;
}

export interface QuestionConfig {
  multiple?: boolean;
  max_selections?: number | null;
  steps?: number;
  shape?: "star" | "heart" | "thumb" | "circle";
  min?: number | null;
  max?: number | null;
  max_length?: number | null;
  placeholder?: string;
  randomize?: boolean;
  alphabetical?: boolean;
}

export interface Question {
  id: number;
  type: QuestionType;
  title: string;
  description: string;
  required: boolean;
  position: number;
  config: QuestionConfig;
  options: Option[];
  logic_rules: LogicRule[];
  answer_count: number;
}

export interface FormSettings {
  welcome: { enabled: boolean; title: string; description: string; button: string; show_time: boolean };
  thank_you: { title: string; description: string; button: string };
  show_progress: boolean;
  show_numbers: boolean;
  letters_on_answers: boolean;
  navigation_arrows: boolean;
}

export interface FormSummary {
  id: number;
  title: string;
  status: "draft" | "published";
  slug: string | null;
  created_at: string;
  updated_at: string;
  theme: Theme;
  response_count: number;
  started_count: number;
}

export interface FormDetail extends FormSummary {
  settings: FormSettings;
  view_count: number;
  questions: Question[];
}

export interface PublicForm {
  title: string;
  slug: string;
  theme: Theme;
  settings: FormSettings;
  questions: Question[];
}

/** An answer as the browser holds it before submission. */
export type AnswerValue = string | number | number[] | null;
export type Answers = Record<number, AnswerValue>;

export interface ResponseItem {
  id: number;
  status: "completed" | "in_progress";
  started_at: string;
  completed_at: string | null;
  answers: { question_id: number; question_title: string; question_type: QuestionType; value: string | number | string[] }[];
}

export interface QuestionSummary {
  id: number;
  type: QuestionType;
  title: string;
  answered: number;
  total: number;
  counts?: { label: string; count: number }[];
  average?: number | null;
  min?: number | null;
  max?: number | null;
  latest?: string[];
}

export interface Summary {
  performance: { views: number; starts: number; submissions: number; completion_rate: number | null; avg_seconds: number | null };
  questions: QuestionSummary[];
}
