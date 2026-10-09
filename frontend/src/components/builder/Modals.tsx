"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Question } from "@/lib/types";
import { Icon } from "../icons";
import { CATALOGUE, type Element } from "../questions/registry";
import { Button, IconButton, Modal, PremiumBadge, SoonBadge, Toggle } from "../ui";
import type { Editor } from "./useFormEditor";

const RECOMMENDED = ["Video and Audio", "Multiple Choice", "Short Text"];
const ALL = CATALOGUE.flat().flatMap((g) => g.items);

export function AddContentModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (e: Element) => void }) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (open) setQuery(""); }, [open]);
  const match = (e: Element) => e.label.toLowerCase().includes(query.trim().toLowerCase());
  const pick = (e: Element) => (e.type || e.action ? onPick(e) : toast(`${e.label} is coming soon`));
  const soon = (what: string) => () => toast(`${what} is coming soon`);

  return (
    <Modal open={open} onClose={onClose} width={1300} bare>
      <div className="flex min-h-0 flex-col bg-canvas">
      <div className="flex items-center gap-2 px-8 pt-2">
        {["Add form elements", "Import questions", "Create with AI"].map((t, i) => (
          <button key={t} type="button" onClick={i ? soon(t) : undefined} aria-current={!i}
            className={`relative px-2.5 py-4 text-[15px] ${i ? "text-ink-2 hover:text-ink" : "text-ink"}`}>
            {!i && <span className="absolute inset-x-0 top-0 h-[3px] rounded-b bg-ink" />}{t}
          </button>
        ))}
        <IconButton icon="x" label="Close" onClick={onClose} className="ml-auto" />
      </div>
      <div className="m-3 mt-0 flex max-h-[78dvh] gap-12 overflow-y-auto rounded-xl bg-surface px-10 py-10 max-lg:flex-col">
        <div className="w-[282px] shrink-0 max-lg:w-full">
          <label className="flex h-11 items-center gap-2 rounded-lg border border-line px-3 text-ink-2 focus-within:border-ink">
            <Icon name="search" size={18} />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search form elements"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none" />
          </label>
          {!query && (
            <>
              <h3 className="mb-3 mt-7 px-3 text-[15px] font-medium">Recommended</h3>
              {RECOMMENDED.map((label) => ALL.find((e) => e.label === label)!).map((e) => (
                <button key={e.label} type="button" onClick={() => pick(e)}
                  className="mb-2 flex h-12 w-full items-center gap-3 rounded-lg border border-line px-3 text-[15px] hover:bg-hover">
                  <Tile e={e} /><span className="flex-1 text-left">{e.label}</span>{e.premium && <PremiumBadge />}
                </button>
              ))}
              <h3 className="mb-3 mt-7 px-3 text-[15px] font-medium">Connect to apps</h3>
              {([["Hubspot", "#ff7a59", false], ["Salesforce", "#1798c1", true]] as const).map(([name, color, premium]) => (
                <button key={name} type="button" onClick={soon(`${name} integration`)}
                  className="mb-2 flex h-12 w-full items-center gap-3 rounded-lg border border-line px-3 text-[15px] hover:bg-hover">
                  <span className="grid size-7 place-items-center rounded-md text-[13px] font-bold text-white" style={{ background: color }}>{name[0]}</span>
                  <span className="flex-1 text-left">{name}</span>{premium && <PremiumBadge />}
                </button>
              ))}
              <button type="button" onClick={soon("App integrations")}
                className="flex h-11 w-full items-center gap-3 rounded-lg border border-line px-3 text-[15px] hover:bg-hover">
                <Icon name="apps" size={18} /> Browse all apps
              </button>
            </>
          )}
        </div>
        {/* Row-major so each row of groups lines up across the three columns, as in Typeform. */}
        <div className="grid flex-1 grid-cols-3 content-start gap-x-10 gap-y-10 max-md:grid-cols-2">
          {[0, 1].flatMap((row) => CATALOGUE.map((column, c) => {
            const group = column[row];
            const items = group.items.filter(match);
            return (
              <section key={`${row}-${c}`} className={items.length ? "" : "hidden"}>
                <h3 className="mb-2 h-6 text-[15px] font-medium">{group.title}</h3>
                {items.map((e) => (
                  <button key={e.label} type="button" onClick={() => pick(e)}
                    className="group -mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-lg px-2 py-2 text-left text-[15px] text-ink hover:bg-hover">
                    <Tile e={e} />
                    <span className="flex-1">{e.label}</span>
                    {!e.type && !e.action && <span className="hidden group-hover:inline"><SoonBadge /></span>}
                    {e.premium && <PremiumBadge />}
                  </button>
                ))}
              </section>
            );
          }))}
        </div>
      </div>
      </div>
    </Modal>
  );
}

function Tile({ e }: { e: Pick<Element, "icon" | "tile"> }) {
  return <span className={`grid size-7 shrink-0 place-items-center rounded-md text-[#3c323e] ${e.tile}`}><Icon name={e.icon} size={17} /></span>;
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
