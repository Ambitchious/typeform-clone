import type {
  FormDetail, FormSettings, FormSummary, LogicRule, PublicForm, Question, QuestionConfig,
  QuestionType, ResponseItem, Summary, Theme,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === "string" ? detail : "Something went wrong");
  }
  /** Per-question validation errors from a 422, keyed by question id. */
  get fieldErrors(): Record<string, string> {
    const d = this.detail as { errors?: Record<string, string> } | undefined;
    return d?.errors ?? {};
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: isForm ? init.headers : { "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  return (res.status === 204 ? undefined : res.json()) as T;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: JSON.stringify(body ?? {}) });

export interface QuestionPatch {
  type?: QuestionType;
  title?: string;
  description?: string;
  required?: boolean;
  config?: QuestionConfig;
  options?: { id?: number; label: string }[];
  logic_rules?: LogicRule[];
}

export const api = {
  forms: () => request<FormSummary[]>("/api/forms"),
  form: (id: number) => request<FormDetail>(`/api/forms/${id}`),
  createForm: (title = "My new form") => request<FormDetail>("/api/forms", json("POST", { title })),
  updateForm: (id: number, data: { title?: string; theme_id?: number; settings?: Partial<FormSettings> }) =>
    request<FormDetail>(`/api/forms/${id}`, json("PATCH", data)),
  deleteForm: (id: number) => request<void>(`/api/forms/${id}`, { method: "DELETE" }),
  duplicateForm: (id: number) => request<FormDetail>(`/api/forms/${id}/duplicate`, { method: "POST" }),
  publish: (id: number) => request<FormDetail>(`/api/forms/${id}/publish`, { method: "POST" }),
  unpublish: (id: number) => request<FormDetail>(`/api/forms/${id}/unpublish`, { method: "POST" }),

  addQuestion: (formId: number, type: QuestionType, afterQuestionId: number | null, title = "") =>
    request<Question>(`/api/forms/${formId}/questions`, json("POST", { type, title, after_question_id: afterQuestionId })),
  updateQuestion: (id: number, data: QuestionPatch) => request<Question>(`/api/questions/${id}`, json("PATCH", data)),
  deleteQuestion: (id: number) => request<void>(`/api/questions/${id}`, { method: "DELETE" }),
  reorder: (formId: number, questionIds: number[]) =>
    request<void>(`/api/forms/${formId}/questions/order`, json("PUT", { question_ids: questionIds })),

  themes: () => request<Theme[]>("/api/themes"),
  createTheme: (data: Omit<Theme, "id" | "is_gallery">) => request<Theme>("/api/themes", json("POST", data)),
  deleteTheme: (id: number) => request<void>(`/api/themes/${id}`, { method: "DELETE" }),
  updateTheme: (id: number, data: Omit<Theme, "id" | "is_gallery">) => request<Theme>(`/api/themes/${id}`, json("PUT", data)),

  summary: (formId: number) => request<Summary>(`/api/forms/${formId}/summary`),
  responses: (formId: number, status: string, page: number) =>
    request<{ total: number; items: ResponseItem[] }>(`/api/forms/${formId}/responses?status=${status}&page=${page}&size=20`),
  deleteResponse: (formId: number, id: number) => request<void>(`/api/forms/${formId}/responses/${id}`, { method: "DELETE" }),
  generateResponse: (formId: number) => request<{ id: number }>(`/api/forms/${formId}/responses/generate`, { method: "POST" }),
  csvUrl: (formId: number) => `${API_URL}/api/forms/${formId}/responses/export.csv`,
  fileUrl: (key: string) => `${API_URL}/api/files/${key}`,

  publicForm: (slug: string) => request<PublicForm>(`/api/public/forms/${slug}`),
  countView: (slug: string) => request<void>(`/api/public/forms/${slug}/view`, { method: "POST" }),
  start: (slug: string) => request<{ response_id: number; token: string }>(`/api/public/forms/${slug}/responses/start`, { method: "POST" }),
  saveAnswer: (slug: string, responseId: number, questionId: number, token: string, value: unknown) =>
    request<void>(`/api/public/forms/${slug}/responses/${responseId}/answers/${questionId}`, json("PUT", { token, value })),
  submit: (slug: string, answers: Record<number, unknown>, session: { response_id: number; token: string } | null) =>
    request<{ id: number }>(`/api/public/forms/${slug}/responses`, json("POST", { answers, ...session })),
  upload: (slug: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<{ key: string; name: string; size: number }>(`/api/public/forms/${slug}/uploads`, { method: "POST", body });
  },
};
