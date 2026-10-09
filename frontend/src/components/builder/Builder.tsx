"use client";

import { useState } from "react";
import type { FormDetail, Question, QuestionType } from "@/lib/types";
import { Canvas } from "./Canvas";
import { ConnectPanel } from "./ConnectPanel";
import { DesignPanel } from "./DesignPanel";
import { LogicEditor } from "./LogicEditor";
import { AddContentModal, BulkChoicesModal, DeleteQuestionModal, FormSettingsModal } from "./Modals";
import { PageList } from "./PageList";
import { SettingsPanel } from "./SettingsPanel";
import { TopBar, type Tab } from "./TopBar";
import { useFormEditor } from "./useFormEditor";

export function Builder({ initial, tab, focusQuestion }: { initial: FormDetail; tab: Tab; focusQuestion?: number }) {
  const editor = useFormEditor(initial);
  const [modal, setModal] = useState<"add" | "design" | "settings" | null>(null);
  const [bulkFor, setBulkFor] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Question | null>(null);
  const [designAnchor, setDesignAnchor] = useState<HTMLElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(true);

  const add = (type: QuestionType) => {
    setModal(null);
    editor.addQuestion(type);
  };

  return (
    <div className="flex h-dvh flex-col">
      <TopBar form={editor.form} tab={tab} saving={editor.saving}
        onRename={(title) => editor.updateForm({ title })} onPublish={editor.setPublished} />
      <div className="flex min-h-0 flex-1 gap-3 px-4 pb-4">
        {tab === "content" && (
          <>
            <PageList editor={editor} onAdd={() => setModal("add")} onDelete={setToDelete} />
            <Canvas editor={editor} onAdd={() => setModal("add")} onDesign={(el) => { setDesignAnchor(el); setModal("design"); }}
              onSettings={() => setModal("settings")} onBulkChoices={setBulkFor}
              settingsOpen={settingsOpen} onToggleSettings={() => setSettingsOpen(!settingsOpen)} />
            {settingsOpen && <SettingsPanel editor={editor} />}
          </>
        )}
        {tab === "workflow" && <LogicEditor editor={editor} focusId={focusQuestion} />}
        {tab === "connect" && <ConnectPanel />}
      </div>

      <AddContentModal open={modal === "add"} onClose={() => setModal(null)} onPick={add} />
      <DesignPanel open={modal === "design"} onClose={() => setModal(null)} editor={editor} anchor={designAnchor} />
      <FormSettingsModal open={modal === "settings"} onClose={() => setModal(null)} editor={editor} />
      <BulkChoicesModal question={editor.form.questions.find((q) => q.id === bulkFor)} onClose={() => setBulkFor(null)} editor={editor} />
      <DeleteQuestionModal question={toDelete} onClose={() => setToDelete(null)}
        onConfirm={() => { if (toDelete) editor.deleteQuestion(toDelete.id); setToDelete(null); }} />
    </div>
  );
}
