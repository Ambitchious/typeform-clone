"use client";

import { AnimatePresence, motion, type Variants } from "motion/react";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { isEmpty, nextIndex } from "@/lib/logic";
import { themeClass, themeVars } from "@/lib/theme";
import type { AnswerValue, Answers, PublicForm } from "@/lib/types";
import { validate } from "@/lib/validate";
import { Icon } from "../icons";
import { QuestionView } from "../questions/QuestionView";
import { TYPES } from "../questions/registry";
import { typingInField } from "../questions/types";

type Screen = "welcome" | "question" | "done";
interface State {
  screen: Screen;
  path: number[]; // indices of questions visited; the last one is on screen
  dir: 1 | -1;
  answers: Answers;
  errors: Record<number, string>;
  submitting: boolean;
}
type Action =
  | { type: "start" }
  | { type: "answer"; id: number; value: AnswerValue }
  | { type: "go"; index: number }
  | { type: "back" }
  | { type: "errors"; errors: Record<number, string>; path?: number[] }
  | { type: "submitting"; on: boolean }
  | { type: "done" }
  | { type: "restore"; state: Partial<State> };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "start": return { ...s, screen: "question", path: [0], dir: 1 };
    case "answer": {
      const errors = { ...s.errors };
      delete errors[a.id];
      return { ...s, answers: { ...s.answers, [a.id]: a.value }, errors };
    }
    case "go": return { ...s, path: [...s.path, a.index], dir: 1 };
    case "back": return s.path.length > 1 ? { ...s, path: s.path.slice(0, -1), dir: -1 } : s;
    case "errors": return { ...s, errors: a.errors, path: a.path ?? s.path, dir: a.path ? -1 : s.dir, submitting: false };
    case "submitting": return { ...s, submitting: a.on };
    case "done": return { ...s, screen: "done", submitting: false, dir: 1 };
    case "restore": return { ...s, ...a.state };
  }
}

// Measured on a live Typeform: the outgoing question rises and fades in ~250ms, the incoming one
// arrives blurred and settles on a soft spring, title first and answers a beat later.
const EASE = [0.215, 0.61, 0.355, 1] as const;
const slide: Variants = {
  enter: (dir: number) => ({ opacity: 0, y: dir * 60, filter: "blur(4px)" }),
  center: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 160, damping: 24, staggerChildren: 0.08 } },
  exit: (dir: number) => ({ opacity: 0, y: dir * -90, filter: "blur(2px)", transition: { duration: 0.25, ease: EASE } }),
};
const part: Variants = { enter: { opacity: 0, y: 12 }, center: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 140, damping: 22 } } };

const AUTO_ADVANCE_MS = 600;
// Upper bound on a transition, in case the exit animation never reports back (e.g. a hidden tab).
const TRANSITION_LOCK_MS = 1500;

interface Props {
  form: PublicForm;
  /** Builder preview: nothing is saved or submitted. */
  preview?: boolean;
}

export function FormRunner({ form, preview = false }: Props) {
  const { questions, settings, slug } = form;
  const storageKey = `tf-progress:${slug}`;
  const [state, dispatch] = useReducer(reducer, {
    screen: settings.welcome.enabled ? "welcome" : "question",
    path: [0], dir: 1, answers: {}, errors: {}, submitting: false,
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const lockUntil = useRef(0);
  const autoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const session = useRef<{ response_id: number; token: string } | null>(null);
  const wheelAt = useRef(0);

  const index = state.path[state.path.length - 1];
  const question = questions[index];
  const isLast = question ? nextIndex(questions, index, state.answers[question.id]) === null : false;
  const answered = questions.filter((q) => !isEmpty(state.answers[q.id])).length;
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  // ---- persistence: resume after a refresh, like Typeform does (localStorage per form) ----
  useEffect(() => {
    if (preview) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved?.path?.every((i: number) => i < questions.length)) {
        session.current = saved.session ?? null;
        dispatch({ type: "restore", state: { answers: saved.answers, path: saved.path, screen: "question" } });
      }
    } catch { /* storage unavailable: start fresh */ }
    if (!sessionStorage.getItem(`viewed:${slug}`)) {
      sessionStorage.setItem(`viewed:${slug}`, "1");
      api.countView(slug).catch(() => {});
    }
  }, [preview, storageKey, slug, questions.length]);

  useEffect(() => {
    if (preview || state.screen !== "question") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers: state.answers, path: state.path, session: session.current }));
    } catch { /* ignore */ }
  }, [preview, storageKey, state.answers, state.path, state.screen]);

  useEffect(() => {
    if (!preview) document.title = state.screen === "question" && question ? `${form.title} | ${question.title}` : form.title;
  }, [preview, state.screen, question, form.title]);

  // ---- partial responses: each confirmed answer is saved as the respondent goes ----
  const savePartial = useCallback(async (questionId: number, value: AnswerValue | undefined) => {
    if (preview || isEmpty(value)) return;
    try {
      session.current ??= await api.start(slug);
      await api.saveAnswer(slug, session.current.response_id, questionId, session.current.token, value);
    } catch { /* best effort: the final submit carries every answer anyway */ }
  }, [preview, slug]);

  const submit = useCallback(async () => {
    const s = stateRef.current;
    if (s.submitting) return;
    dispatch({ type: "submitting", on: true });
    if (preview) {
      toast.success("Test successful! Publish your form to collect real responses.");
      return dispatch({ type: "done" });
    }
    try {
      await api.submit(slug, s.answers, session.current).catch((e) => {
        // The saved partial response is gone (e.g. the server's database was reset): submit as new.
        if (!(e instanceof ApiError && e.status === 404 && session.current)) throw e;
        session.current = null;
        return api.submit(slug, s.answers, null);
      });
      localStorage.removeItem(storageKey);
      dispatch({ type: "done" });
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        const errors = Object.fromEntries(Object.entries(e.fieldErrors).map(([k, v]) => [Number(k), v]));
        // Take the respondent back to the first question the server rejected.
        const firstBad = s.path.findIndex((i) => errors[questions[i].id]);
        dispatch({ type: "errors", errors, path: firstBad >= 0 ? s.path.slice(0, firstBad + 1) : undefined });
      } else if (e instanceof ApiError && e.status === 409) {
        localStorage.removeItem(storageKey);
        session.current = null;
        dispatch({ type: "submitting", on: false });
        toast.error("This response was already submitted. Please try again.");
      } else {
        dispatch({ type: "submitting", on: false });
        toast.error("We couldn't submit your answers. Check your connection and try again.");
      }
    }
  }, [preview, slug, storageKey, questions]);

  // Navigation stays locked until the outgoing question has fully left (onExitComplete), and focus
  // leaves its field now — otherwise fast typing lands in the question that is animating away.
  const beginTransition = () => {
    lockUntil.current = Date.now() + TRANSITION_LOCK_MS;
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const goNext = useCallback(() => {
    const s = stateRef.current;
    if (s.screen !== "question" || Date.now() < lockUntil.current) return;
    const i = s.path[s.path.length - 1];
    const q = questions[i];
    const value = s.answers[q.id];
    const error = validate(q, value);
    if (error) return dispatch({ type: "errors", errors: { ...s.errors, [q.id]: error } });
    clearTimeout(autoTimer.current);
    savePartial(q.id, value);
    const next = nextIndex(questions, i, value);
    if (next === null) return submit();
    beginTransition();
    dispatch({ type: "go", index: next });
  }, [questions, savePartial, submit]);

  const goBack = useCallback(() => {
    if (Date.now() < lockUntil.current || stateRef.current.path.length < 2) return;
    clearTimeout(autoTimer.current);
    beginTransition();
    dispatch({ type: "back" });
  }, []);

  const onChange = useCallback((value: AnswerValue) => {
    const q = questions[stateRef.current.path[stateRef.current.path.length - 1]];
    dispatch({ type: "answer", id: q.id, value });
    clearTimeout(autoTimer.current);
    const single = TYPES[q.type].autoAdvance && !(q.type === "multiple_choice" && q.config.multiple);
    if (single && !isEmpty(value)) autoTimer.current = setTimeout(goNext, AUTO_ADVANCE_MS);
  }, [questions, goNext]);

  const start = useCallback(() => {
    beginTransition();
    dispatch({ type: "start" });
  }, []);

  // ---- keyboard: Enter / ⌘↵ / arrows; fields handle their own Enter ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (s.screen === "welcome" && e.key === "Enter") return start();
      if (s.screen !== "question") return;
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); return goNext(); }
      if (typingInField(e)) return;
      if (e.key === "Enter") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); goBack(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goBack, start]);

  useEffect(() => () => clearTimeout(autoTimer.current), []);

  // A deliberate wheel/trackpad flick moves one question; momentum after it is ignored.
  const onWheel = (e: React.WheelEvent) => {
    if (state.screen !== "question" || Math.abs(e.deltaY) < 40 || Date.now() - wheelAt.current < 900) return;
    const scroller = (e.target as HTMLElement).closest("[data-scroll]");
    if (scroller && scroller.scrollHeight > scroller.clientHeight) return;
    wheelAt.current = Date.now();
    if (e.deltaY > 0) goNext(); else goBack();
  };

  const minutes = useMemo(() => Math.max(1, Math.round((questions.length * 9) / 60)), [questions.length]);
  const error = question ? state.errors[question.id] : undefined;

  return (
    <div className={`${themeClass(form.theme)} relative flex h-full w-full flex-col overflow-hidden`} style={themeVars(form.theme)} onWheel={onWheel}>
      {settings.show_progress && state.screen === "question" && (
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 px-1.5 pt-1" aria-hidden>
          <div className="h-[3px] rounded-full transition-[width] duration-200 ease-in-out" style={{ width: `${(answered / questions.length) * 100}%`, background: "var(--tf-q)" }} />
          <div className="h-[3px] flex-1 rounded-full" style={{ background: "color-mix(in srgb, var(--tf-q) 30%, transparent)" }} />
        </div>
      )}

      <AnimatePresence mode="wait" custom={state.dir} onExitComplete={() => { lockUntil.current = 0; }}>
        {state.screen === "welcome" && (
          <motion.section key="welcome" custom={1} variants={slide} initial="enter" animate="center" exit="exit"
            className="tf-w flex flex-1 flex-col justify-center px-6 pb-24 sm:px-16 sm:pb-0">
            <motion.h1 variants={part} className="tf-w-title max-w-[720px]">{settings.welcome.title || form.title}</motion.h1>
            {settings.welcome.description && (
              <motion.p variants={part} className="mt-3 max-w-[640px] text-[18px] sm:text-[20px]" style={{ color: "var(--tf-q-soft)" }}>{settings.welcome.description}</motion.p>
            )}
            <motion.div variants={part} className="mt-8 flex flex-col items-[var(--tf-w-items)] gap-3 max-sm:fixed max-sm:inset-x-4 max-sm:bottom-6">
              <button type="button" className="tf-btn max-sm:w-full max-sm:justify-center" onClick={start}>{settings.welcome.button || "Start"}</button>
              {settings.welcome.show_time && (
                <span className="flex items-center gap-1.5 text-[14px] max-sm:order-first" style={{ color: "var(--tf-q-soft)" }}>
                  <Icon name="clock" size={14} /> Takes {minutes} minute{minutes > 1 ? "s" : ""}
                </span>
              )}
            </motion.div>
          </motion.section>
        )}

        {state.screen === "question" && question && (
          <motion.section key={question.id} custom={state.dir} variants={slide} initial="enter" animate="center" exit="exit"
            data-scroll className="flex flex-1 overflow-y-auto px-6 pb-28 pt-16 sm:px-10 sm:pb-16">
            <div className="m-auto w-full max-w-[720px] sm:pl-8">
              <motion.div variants={part}>
                <QuestionView question={question} number={settings.show_numbers ? index + 1 : null} value={state.answers[question.id]}
                  onChange={onChange} onSubmit={goNext} active letters={settings.letters_on_answers} slug={slug} />
              </motion.div>
              <motion.div variants={part} className="mt-6">
                {error && <p role="alert" className="tf-error mb-5"><Icon name="warning" size={15} />{error}</p>}
                <div className="tf-q-actions flex items-center gap-3 max-sm:fixed max-sm:inset-x-4 max-sm:bottom-6 max-sm:z-10">
                    <button type="button" onClick={goNext} disabled={state.submitting}
                      className="tf-btn max-sm:w-full max-sm:justify-center">
                      {isLast ? (state.submitting ? "Submitting…" : "Submit") : <>OK <Icon name="check" size={18} strokeWidth={2.5} /></>}
                    </button>
                    {isLast && (
                      <span className="text-[13px] max-sm:hidden" style={{ color: "var(--tf-q-soft)" }}>
                        press <b>{isMac ? "Cmd ⌘" : "Ctrl"}</b> + <b>Enter ↵</b>
                      </span>
                    )}
                </div>
              </motion.div>
            </div>
          </motion.section>
        )}

        {state.screen === "done" && (
          <motion.section key="done" custom={1} variants={slide} initial="enter" animate="center" exit="exit"
            className="tf-w flex flex-1 flex-col justify-center px-6 sm:px-16">
            <motion.h1 variants={part} className="tf-w-title max-w-[720px]">{settings.thank_you.title}</motion.h1>
            {settings.thank_you.description && (
              <motion.p variants={part} className="mt-3 max-w-[640px] text-[18px] sm:text-[20px]" style={{ color: "var(--tf-q-soft)" }}>{settings.thank_you.description}</motion.p>
            )}
            {settings.thank_you.button && (
              <motion.a variants={part} href="/" className="tf-btn mt-8">{settings.thank_you.button}</motion.a>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {state.screen === "question" && (
        <div className="absolute bottom-4 right-4 z-10 hidden items-center gap-2 sm:flex">
          {settings.navigation_arrows && (
            <div className="flex gap-px">
              <button type="button" aria-label="Navigate to previous question" onClick={goBack} disabled={state.path.length < 2}
                className="tf-btn !h-8 !w-8 !justify-center !rounded-l-lg !rounded-r-[2px] !p-0"><Icon name="up" size={18} strokeWidth={2.25} /></button>
              <button type="button" aria-label="Navigate to next question" onClick={goNext} disabled={isLast}
                className="tf-btn !h-8 !w-8 !justify-center !rounded-r-lg !rounded-l-[2px] !p-0"><Icon name="down" size={18} strokeWidth={2.25} /></button>
            </div>
          )}
          <span className="tf-btn !h-8 !cursor-default !rounded-lg !px-2.5 !text-[12px] !font-medium">Powered by <b className="font-bold">Typeform</b></span>
        </div>
      )}
    </div>
  );
}
