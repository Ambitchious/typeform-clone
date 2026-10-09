"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Question } from "@/lib/types";
import { Icon, type IconName } from "../icons";
import { CATALOGUE, type Element } from "../questions/registry";
import { Button, IconButton, Modal, PremiumBadge, SoonBadge, Toggle } from "../ui";
import type { Editor } from "./useFormEditor";

const RECOMMENDED = ["Video and Audio", "Short Text", "Multiple Choice"];
const ALL = CATALOGUE.flat().flatMap((g) => g.items);
const TABS = ["Add form elements", "Import questions", "Create with AI"] as const;
const AI_TEMPLATES: [IconName, string, string, boolean][] = [
  ["layers", "Lead qualification form", "Qualify your leads with AI-generated questions and scoring rules.", false],
  ["tag", "Product recommendation quiz", "Boost sales by recommending products with AI-generated questions and matching rules.", true],
  ["users", "Personality quiz", "Show different results based on answers with AI-generated questions and matching rules.", true],
];

/** Typeform's "Add content" dialog, measured at 1440px: 960px wide, 14px text, 36px rows. */
export function AddContentModal({ open, onClose, onPick, onImport }: {
  open: boolean; onClose: () => void; onPick: (e: Element) => void; onImport: (titles: string[]) => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [query, setQuery] = useState("");
  const [imported, setImported] = useState("");
  useEffect(() => { if (open) { setQuery(""); setImported(""); setTab(TABS[0]); } }, [open]);
  const match = (e: Element) => e.label.toLowerCase().includes(query.trim().toLowerCase());
  const pick = (e: Element) => (e.type || e.action ? onPick(e) : toast(`${e.label} is coming soon`));
  const soon = (what: string) => () => toast(`${what} is coming soon`);
  const lines = imported.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} width={960} bare>
      <div className="flex max-h-[calc(100dvh-56px)] flex-col bg-canvas">
        <div className="flex h-14 shrink-0 items-center gap-1 pl-5 pr-3">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} aria-current={tab === t}
              className={`relative h-8 rounded-lg px-3 text-[14px] font-medium hover:bg-hover ${tab === t ? "text-ink" : "text-ink-2"}`}>
              {tab === t && <span className="absolute inset-x-0 -top-3 h-[3px] rounded-b bg-ink" />}{t}
            </button>
          ))}
          <IconButton icon="x" label="Close" onClick={onClose} className="ml-auto" />
        </div>

        <div className="ml-4 min-h-0 overflow-y-auto rounded-l-xl bg-surface p-8">
          {tab === "Add form elements" && (
            <div className="flex gap-8 max-md:flex-col">
              <div className="w-[208px] shrink-0">
                <label className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-ink-2 focus-within:border-ink">
                  <Icon name="search" size={16} />
                  <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search form elements"
                    className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none" />
                </label>
                {!query && (
                  <>
                    <h3 className="mb-2 mt-6 px-2 text-[14px] font-medium">Recommended</h3>
                    {RECOMMENDED.map((label) => ALL.find((e) => e.label === label)!).map((e) => (
                      <SideButton key={e.label} onClick={() => pick(e)} icon={<Tile e={e} />} label={e.label} premium={e.premium} />
                    ))}
                    <h3 className="mb-2 mt-6 px-2 text-[14px] font-medium">Connect to apps</h3>
                    <SideButton onClick={soon("Hubspot integration")} label="Hubspot"
                      icon={<span className="grid size-6 place-items-center rounded-md bg-[#ff7a59] text-[12px] font-bold text-white">H</span>} />
                    <SideButton onClick={soon("Salesforce integration")} label="Salesforce" premium
                      icon={<span className="grid size-6 place-items-center rounded-md bg-[#1798c1] text-[12px] font-bold text-white">S</span>} />
                    <SideButton onClick={soon("App integrations")} label="Browse all apps" icon={<Icon name="apps" size={18} className="mx-[3px]" />} />
                  </>
                )}
              </div>
              {/* Row-major so each row of groups lines up across the three columns, as in Typeform. */}
              <div className="grid flex-1 grid-cols-3 content-start gap-x-4 gap-y-6 max-md:grid-cols-2">
                {[0, 1].flatMap((row) => CATALOGUE.map((column, c) => {
                  const group = column[row];
                  const items = group.items.filter(match);
                  return (
                    <section key={`${row}-${c}`} className={items.length ? "" : "hidden"}>
                      <h3 className="flex h-10 items-start px-2 pt-2.5 text-[14px] font-medium">{group.title}</h3>
                      {items.map((e) => (
                        <button key={e.label} type="button" onClick={() => pick(e)}
                          className="group flex h-9 w-full items-center gap-2.5 whitespace-nowrap rounded-lg pl-2 pr-1 text-left text-[14px] text-ink-2 hover:bg-hover hover:text-ink">
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
          )}

          {tab === "Import questions" && (
            <div className="flex gap-8 max-md:flex-col">
              <label className="flex flex-1 flex-col">
                <span className="mb-2 text-[14px] text-ink-2">Form questions</span>
                <textarea autoFocus value={imported} onChange={(e) => setImported(e.target.value)} rows={14}
                  placeholder="Copy and paste or type in your questions, and press enter after each one."
                  className="resize-none rounded-lg border border-line bg-canvas p-3 text-[14px] text-ink outline-none focus:border-ink" />
              </label>
              <div className="w-[240px] shrink-0 pt-7">
                <div className="rounded-lg border border-[#8db4e8] bg-[#f5f9fe] p-4 text-[14px] text-ink dark:bg-transparent">
                  <Icon name="info" size={20} className="mb-2 text-[#2f5e9e]" />
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Paste or type your questions in the text field</li>
                    <li>Or try Create with AI to build your form from a description, file upload, or URL</li>
                  </ul>
                </div>
                <Button className="mt-6 w-full" onClick={() => setTab("Create with AI")}>Create with AI</Button>
              </div>
            </div>
          )}

          {tab === "Create with AI" && (
            <div className="mx-auto max-w-[740px]">
              <div className="flex gap-8 border-b border-line pb-6 max-md:flex-col">
                <div className="w-[230px] shrink-0">
                  <p className="text-[14px] text-ink-2">Typeform AI</p>
                  <h3 className="mt-2 text-[22px] leading-snug text-ink">What would you like to create?</h3>
                </div>
                <form className="flex-1 rounded-xl p-1 shadow-[0_0_0_3px_#efe7fa]" onSubmit={(e) => { e.preventDefault(); toast("Typeform AI is coming soon"); }}>
                  <div className="rounded-lg border border-[#c9b6e4] bg-surface p-3">
                    <textarea autoFocus rows={4} placeholder="Create a…" aria-label="Describe your form"
                      className="w-full resize-none bg-transparent text-[14px] text-ink outline-none" />
                    <div className="flex items-center gap-3 text-ink-2">
                      <Icon name="mic" size={17} /><Icon name="plus" size={17} /><Icon name="more" size={17} strokeWidth={3} />
                      <button type="submit" aria-label="Send" className="ml-auto grid size-7 place-items-center rounded-md border border-line text-ink-3"><Icon name="send" size={13} /></button>
                    </div>
                  </div>
                </form>
              </div>
              <div className="space-y-4 pt-6">
                {AI_TEMPLATES.map(([icon, title, text, quiz]) => (
                  <button key={title} type="button" onClick={soon(title)}
                    className="flex w-full items-start gap-4 rounded-xl border border-line p-4 text-left hover:bg-hover">
                    <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#edf3fb] text-[#2f5e9e]"><Icon name={icon} size={22} /></span>
                    <span className="max-w-[360px] flex-1">
                      <span className="block text-[15px] text-ink">{title}</span>
                      <span className="mt-1 block text-[14px] text-ink-2">{text}</span>
                    </span>
                    {quiz && <span className="rounded-md border border-[#8db4e8] px-2 py-0.5 text-[13px] text-[#2f5e9e]">Match quiz</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {tab === "Import questions" && (
          <div className="flex justify-end px-6 py-3">
            <Button variant="primary" disabled={!lines.length} onClick={() => onImport(lines)}>Import questions</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function SideButton({ onClick, icon, label, premium }: { onClick: () => void; icon: React.ReactNode; label: string; premium?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className="mb-2 flex h-[38px] w-full items-center gap-2.5 rounded-lg border border-line pl-2 pr-3 text-[14px] text-ink hover:bg-hover">
      {icon}<span className="flex-1 text-left">{label}</span>{premium && <PremiumBadge />}
    </button>
  );
}

function Tile({ e }: { e: Pick<Element, "icon" | "tile"> }) {
  return <span className={`grid size-6 shrink-0 place-items-center rounded-md text-[#3c323e] ${e.tile}`}><Icon name={e.icon} size={15} /></span>;
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
