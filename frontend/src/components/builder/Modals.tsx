"use client";

import { useEffect, useState } from "react";
import type { Question, QuestionType } from "@/lib/types";
import { Icon } from "../icons";
import { COMING_SOON, TYPES, type TypeInfo } from "../questions/registry";
import { Button, Modal, SoonBadge, Toggle } from "../ui";
import type { Editor } from "./useFormEditor";

const GROUPS: TypeInfo["group"][] = ["Contact info", "Choice", "Rating & ranking", "Text & Video", "Other"];

export function AddContentModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (t: QuestionType) => void }) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (open) setQuery(""); }, [open]);
  const match = (label: string) => label.toLowerCase().includes(query.trim().toLowerCase());
  return (
    <Modal open={open} onClose={onClose} width={960}>
      <div className="flex flex-col gap-6 pt-4 md:flex-row">
        <div className="md:w-[210px]">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-ink-2">
            <Icon name="search" size={16} />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search form elements"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none" />
          </label>
          <h3 className="mb-2 mt-5 px-1 text-[14px] font-medium">Recommended</h3>
          {(["short_text", "multiple_choice", "email"] as QuestionType[]).map((t) => (
            <button key={t} type="button" onClick={() => onPick(t)}
              className="mb-1.5 flex w-full items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-[14px] hover:bg-hover">
              <Tile info={TYPES[t]} />{TYPES[t].label}
            </button>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-3">
          {GROUPS.map((group) => {
            const live = Object.entries(TYPES).filter(([, info]) => info.group === group && match(info.label));
            const soon = COMING_SOON.filter((s) => s.group === group && match(s.label));
            if (!live.length && !soon.length) return null;
            return (
              <section key={group}>
                <h3 className="mb-2 px-2 text-[14px] font-medium">{group}</h3>
                {live.map(([type, info]) => (
                  <button key={type} type="button" onClick={() => onPick(type as QuestionType)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[14px] text-ink-2 hover:bg-hover hover:text-ink">
                    <Tile info={info} />{info.label}
                  </button>
                ))}
                {soon.map((s) => (
                  <div key={s.label} title="Coming soon" aria-disabled
                    className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-2 text-[14px] text-ink-3">
                    <span className={`grid size-6 place-items-center rounded-md text-[#3c323e] opacity-60 ${s.tile}`}><Icon name={s.icon} size={15} /></span>
                    <span className="flex-1">{s.label}</span><SoonBadge />
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

function Tile({ info }: { info: { icon: TypeInfo["icon"]; tile: string } }) {
  return <span className={`grid size-6 shrink-0 place-items-center rounded-md text-[#3c323e] ${info.tile}`}><Icon name={info.icon} size={15} /></span>;
}

/** Typeform edits dropdown choices as one block of text, one choice per line. */
export function BulkChoicesModal({ question, onClose, editor }: { question: Question | undefined; onClose: () => void; editor: Editor }) {
  const [text, setText] = useState("");
  useEffect(() => setText(question?.options.map((o) => o.label).join("\n") ?? ""), [question]);
  const save = () => {
    if (!question) return;
    // Keep ids for lines that still match an existing label, so their old answers stay attached.
    const byLabel = new Map(question.options.map((o) => [o.label, o.id]));
    const options = text.split("\n").map((l) => l.trim()).filter(Boolean).map((label) => ({ id: byLabel.get(label), label }));
    editor.patchQuestion(question.id, { options });
    onClose();
  };
  return (
    <Modal open={!!question} onClose={onClose} title={question?.options.length ? "Edit choices" : "Add choices"}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save choices</Button></>}>
      <p className="mb-3 text-[14px] text-ink-2">Write or paste your choices below. Each choice must be on a separate line.</p>
      <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder={"Your choices go here\nOne per line\nLike this\n:-)"}
        className="w-full resize-y rounded-lg border border-line bg-canvas p-3 text-[14px] text-ink outline-none focus:border-ink" />
    </Modal>
  );
}

export function DeleteQuestionModal({ question, onClose, onConfirm }: { question: Question | null; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal open={!!question} onClose={onClose} title="Delete this question?"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={onConfirm}>Delete</Button></>}>
      <p className="text-[14px] text-ink-2">
        {question?.answer_count
          ? `${question.answer_count} response${question.answer_count > 1 ? "s have" : " has"} answered this question. Their answers stay in your results, but the question will no longer be asked.`
          : "This question will be removed from your form."}
      </p>
    </Modal>
  );
}

export function FormSettingsModal({ open, onClose, editor }: { open: boolean; onClose: () => void; editor: Editor }) {
  const s = editor.form.settings;
  const set = (key: "show_progress" | "show_numbers" | "letters_on_answers" | "navigation_arrows") => (v: boolean) => editor.updateForm({ settings: { [key]: v } });
  return (
    <Modal open={open} onClose={onClose} title="Settings" footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <Toggle label="Progress bar" checked={s.show_progress} onChange={set("show_progress")} />
      <Toggle label="Question numbers" checked={s.show_numbers} onChange={set("show_numbers")} />
      <Toggle label="Letters on answers" hint="Turning these off also turns off letter keyboard shortcuts" checked={s.letters_on_answers} onChange={set("letters_on_answers")} />
      <Toggle label="Navigation arrows" checked={s.navigation_arrows} onChange={set("navigation_arrows")} />
      <hr className="my-3 border-line" />
      {["Response limits", "Schedule a close date", "Email notifications", "Language"].map((label) => (
        <div key={label} className="flex items-center justify-between py-2 text-[14px] text-ink-3">{label}<SoonBadge /></div>
      ))}
    </Modal>
  );
}
