"use client";

import { useState } from "react";
import { themeClass, themeVars } from "@/lib/theme";
import type { PublicForm } from "@/lib/types";
import { toast } from "sonner";
import { Icon, type IconName } from "../icons";
import { InlineText, QuestionView } from "../questions/QuestionView";
import { FormRunner } from "../respondent/FormRunner";
import { Button, IconButton } from "../ui";
import type { Editor } from "./useFormEditor";

const SOON_TOOLS: [IconName, string][] = [["accessibility", "Check accessibility"], ["history", "Version History"], ["translate", "Translations"]];

interface Props {
  editor: Editor;
  onAdd: () => void;
  onDesign: (anchor: HTMLElement) => void;
  onSettings: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onBulkChoices: (questionId: number) => void;
}

/** The centre of the builder: the selected block drawn with the real respondent components,
 *  in the form's theme, and edited in place. */
export function Canvas({ editor, onAdd, onDesign, onSettings, settingsOpen, onToggleSettings, onBulkChoices }: Props) {
  const { form, selected, patchQuestion, updateForm } = editor;
  const [mobile, setMobile] = useState(false);
  const [preview, setPreview] = useState<number | null>(null); // key: bump to restart

  const index = form.questions.findIndex((q) => q.id === selected);
  const question = form.questions[index];
  const { welcome, thank_you } = form.settings;
  const runnerForm: PublicForm = { title: form.title, slug: form.slug ?? "preview", theme: form.theme, settings: form.settings, questions: form.questions };

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-1 rounded-xl bg-panel p-2">
        <Button variant="primary" icon="plus" onClick={onAdd}>Add content</Button>
        <span className="mx-1 h-5 w-px bg-line" />
        <Button variant="ghost" icon="palette" onClick={(e) => onDesign(e.currentTarget)}>Design</Button>
        <span className="mx-1 h-5 w-px bg-line" />
        <IconButton icon={mobile ? "desktop" : "phone"} label={mobile ? "Desktop view" : "Mobile view"} onClick={() => setMobile(!mobile)} />
        <IconButton icon="play" label="Preview" onClick={() => setPreview(Date.now())} disabled={!form.questions.length} />
        <span className="mx-1 h-5 w-px bg-line" />
        {SOON_TOOLS.map(([icon, label]) => (
          <IconButton key={icon} icon={icon} label={label} onClick={() => toast(`${label} is coming soon`)} />
        ))}
        <IconButton icon="settings" label="Form settings" onClick={onSettings} />
        <IconButton icon="panel" label={settingsOpen ? "Hide settings panel" : "Show settings panel"} onClick={onToggleSettings}
          className="ml-auto" aria-pressed={settingsOpen} />
      </div>

      <div className="grid min-h-0 flex-1 place-items-center overflow-hidden rounded-xl bg-panel p-4">
        <div className={`${themeClass(form.theme)} relative flex h-full w-full overflow-y-auto rounded-lg shadow-sm ring-1 ring-line transition-[max-width] duration-300 ${mobile ? "max-w-[375px]" : "max-w-full"}`}
          style={themeVars(form.theme)}>
          <div className={`m-auto w-full max-w-[720px] py-16 ${mobile ? "px-6" : "px-14"}`}>
            {question && (
              <QuestionView key={question.id} question={question} number={form.settings.show_numbers ? index + 1 : null}
                letters={form.settings.letters_on_answers}
                edit={{
                  setText: (field, value) => patchQuestion(question.id, { [field]: value }),
                  setOptions: (options) => patchQuestion(question.id, { options }),
                  openBulkChoices: () => onBulkChoices(question.id),
                }} />
            )}
            {question && question.answer_count > 0 && (
              <p className="mt-8 flex items-center gap-1.5 text-[12px] opacity-60"><Icon name="warning" size={13} />
                {question.answer_count} response{question.answer_count > 1 ? "s" : ""} already answered this — edits apply to future respondents.
              </p>
            )}
            {selected === "welcome" && (
              <div className="tf-w flex flex-col">
                <div className="tf-w-title">
                  <InlineText value={welcome.title} placeholder="Say hi! Recall information with @"
                    onCommit={(title) => updateForm({ settings: { welcome: { ...welcome, title } } })} />
                </div>
                <div className="mt-3 text-[18px]" style={{ color: "var(--tf-q-soft)" }}>
                  <InlineText value={welcome.description} placeholder="Description (optional)"
                    onCommit={(description) => updateForm({ settings: { welcome: { ...welcome, description } } })} />
                </div>
                <span className="tf-btn mt-8 self-[var(--tf-w-items)]">{welcome.button || "Start"}</span>
                {welcome.show_time && <p className="mt-3 text-[14px]" style={{ color: "var(--tf-q-soft)" }}>Takes X minutes</p>}
              </div>
            )}
            {selected === "end" && (
              <div className="tf-w flex flex-col">
                <div className="tf-w-title">
                  <InlineText value={thank_you.title} placeholder="Thank you!"
                    onCommit={(title) => updateForm({ settings: { thank_you: { ...thank_you, title } } })} />
                </div>
                <div className="mt-3 text-[18px]" style={{ color: "var(--tf-q-soft)" }}>
                  <InlineText value={thank_you.description} placeholder="Description (optional)"
                    onCommit={(description) => updateForm({ settings: { thank_you: { ...thank_you, description } } })} />
                </div>
                {thank_you.button && <span className="tf-btn mt-8 self-[var(--tf-w-items)]">{thank_you.button}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {preview !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40 p-4 backdrop-blur-[2px]" role="dialog" aria-label="Preview">
          <div className="mx-auto mb-3 flex gap-1 rounded-xl bg-surface p-1 shadow">
            <IconButton icon="x" label="Close preview" onClick={() => setPreview(null)} />
            <IconButton icon={mobile ? "desktop" : "phone"} label={mobile ? "Desktop view" : "Mobile view"} onClick={() => setMobile(!mobile)} />
            <IconButton icon="restart" label="Restart" onClick={() => setPreview(Date.now())} />
          </div>
          <div className={`mx-auto h-full w-full overflow-hidden rounded-xl shadow-2xl transition-[max-width] duration-300 ${mobile ? "max-w-[390px]" : "max-w-[1100px]"}`}>
            <FormRunner key={preview} form={runnerForm} preview />
          </div>
        </div>
      )}
    </main>
  );
}
