"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { api, ApiError, type QuestionPatch } from "@/lib/api";
import type { FormDetail, FormSettings, Question, QuestionType, Theme } from "@/lib/types";

export type Selection = number | "welcome" | "end";

/** All builder state and every save goes through here. Edits apply locally first (so typing
 *  feels instant) and are then confirmed by the server. */
export function useFormEditor(initial: FormDetail) {
  const [form, setForm] = useState(initial);
  const [selected, setSelected] = useState<Selection>(initial.questions[0]?.id ?? (initial.settings.welcome.enabled ? "welcome" : "end"));
  const [pending, setPending] = useState(0);
  // Latest request number per question: a slow older save must not overwrite a newer edit.
  const seq = useRef(new Map<number, number>());

  const track = useCallback(async <T,>(work: Promise<T>, failMessage: string): Promise<T | undefined> => {
    setPending((n) => n + 1);
    try {
      return await work;
    } catch (e) {
      toast.error(e instanceof ApiError && typeof e.detail === "string" ? e.detail : failMessage);
      return undefined;
    } finally {
      setPending((n) => n - 1);
    }
  }, []);

  const replaceQuestion = (q: Question) =>
    setForm((f) => ({ ...f, questions: f.questions.map((x) => (x.id === q.id ? { ...x, ...q } : x)) }));

  const patchQuestion = useCallback(async (id: number, patch: QuestionPatch) => {
    // Show the change immediately (options and rules wait for server ids).
    const simple = Object.fromEntries(Object.entries(patch).filter(([k]) => k !== "options" && k !== "logic_rules"));
    setForm((f) => ({ ...f, questions: f.questions.map((q) => (q.id === id ? { ...q, ...simple } as Question : q)) }));
    const mine = (seq.current.get(id) ?? 0) + 1;
    seq.current.set(id, mine);
    const saved = await track(api.updateQuestion(id, patch), "Couldn't save that change");
    if (saved && seq.current.get(id) === mine) replaceQuestion(saved);
    else if (!saved) setForm(await api.form(form.id)); // re-sync after a failed save
  }, [track, form.id]);

  const addQuestion = useCallback(async (type: QuestionType) => {
    const after = typeof selected === "number" ? selected : form.questions.at(-1)?.id ?? null;
    const q = await track(api.addQuestion(form.id, type, after), "Couldn't add the question");
    if (!q) return;
    setForm(await api.form(form.id)); // positions of later questions shift, so reload the list
    setSelected(q.id);
  }, [form.id, form.questions, selected, track]);

  /** Typeform's "Import questions": one short-text question per line, added in order after the selection. */
  const importQuestions = useCallback(async (titles: string[]) => {
    let after = typeof selected === "number" ? selected : form.questions.at(-1)?.id ?? null;
    for (const title of titles) {
      const q = await track(api.addQuestion(form.id, "short_text", after, title), "Couldn't import the questions");
      if (!q) break;
      after = q.id;
    }
    setForm(await api.form(form.id));
    if (after) setSelected(after);
    toast.success(`${titles.length} question${titles.length > 1 ? "s" : ""} imported`);
  }, [form.id, form.questions, selected, track]);

  const deleteQuestion = useCallback(async (id: number) => {
    const index = form.questions.findIndex((q) => q.id === id);
    const done = await track(api.deleteQuestion(id).then(() => true), "Couldn't delete the question");
    if (!done) return;
    const questions = form.questions.filter((q) => q.id !== id);
    setForm({ ...form, questions });
    setSelected(questions[Math.min(index, questions.length - 1)]?.id ?? "welcome");
    toast.success("Question deleted");
  }, [form, track]);

  const duplicateQuestion = useCallback(async (q: Question) => {
    const copy = await track(api.addQuestion(form.id, q.type, q.id), "Couldn't duplicate the question");
    if (!copy) return;
    await api.updateQuestion(copy.id, {
      title: q.title, description: q.description, required: q.required, config: q.config,
      options: q.options.map((o) => ({ label: o.label })),
    });
    setForm(await api.form(form.id));
    setSelected(copy.id);
  }, [form.id, track]);

  const reorder = useCallback(async (ids: number[]) => {
    const before = form.questions;
    const byId = new Map(before.map((q) => [q.id, q]));
    setForm({ ...form, questions: ids.map((id, i) => ({ ...byId.get(id)!, position: i })) });
    const ok = await track(api.reorder(form.id, ids).then(() => true), "Couldn't save the new order");
    if (!ok) setForm({ ...form, questions: before });
    else if (before.some((q) => q.logic_rules.length)) setForm(await api.form(form.id)); // backward jumps were dropped
  }, [form, track]);

  const updateForm = useCallback(async (data: { title?: string; theme_id?: number; settings?: Partial<FormSettings> }) => {
    setForm((f) => ({ ...f, ...(data.title ? { title: data.title } : {}), settings: { ...f.settings, ...data.settings } }));
    const saved = await track(api.updateForm(form.id, data), "Couldn't save the form");
    if (saved) setForm(saved);
  }, [form.id, track]);

  const setTheme = useCallback((theme: Theme) => {
    setForm((f) => ({ ...f, theme }));
    return updateForm({ theme_id: theme.id });
  }, [updateForm]);

  const setPublished = useCallback(async (publish: boolean) => {
    const saved = await track(publish ? api.publish(form.id) : api.unpublish(form.id), "Couldn't change the publish state");
    if (saved) {
      setForm(saved);
      toast.success(publish ? "Your form is live" : "Form unpublished — the link no longer works");
    }
    return saved;
  }, [form.id, track]);

  return {
    form, setForm, selected, setSelected, saving: pending > 0,
    patchQuestion, addQuestion, importQuestions, deleteQuestion, duplicateQuestion, reorder, updateForm, setTheme, setPublished,
  };
}

export type Editor = ReturnType<typeof useFormEditor>;
