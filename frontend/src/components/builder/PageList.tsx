"use client";

import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId } from "react";
import type { Question } from "@/lib/types";
import { Icon } from "../icons";
import { Menu, TypeTile } from "../ui";
import type { Editor } from "./useFormEditor";

interface Props {
  editor: Editor;
  onAdd: () => void;
  onDelete: (q: Question) => void;
}

export function PageList({ editor, onAdd, onDelete }: Props) {
  const { form, selected, setSelected, reorder, updateForm, duplicateQuestion } = editor;
  // dnd-kit generates accessibility ids; a stable one keeps server and client HTML identical.
  const dndId = useId();
  // A small drag distance keeps plain clicks (select a question) from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = form.questions.map((q) => q.id);
    reorder(arrayMove(ids, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id))));
  };

  return (
    <aside className="flex w-[264px] shrink-0 flex-col gap-3 overflow-hidden" aria-label="Form pages">
      <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-panel p-3">
        <h2 className="px-2 pb-2 pt-1 text-[15px] font-medium text-ink">Pages</h2>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {form.settings.welcome.enabled ? (
            <Row active={selected === "welcome"} onClick={() => setSelected("welcome")}
              tile={<span className="inline-flex h-6 items-center rounded-md bg-tile-screen px-1.5 text-[#3c323e]"><Icon name="welcome" size={15} /></span>}
              title={form.settings.welcome.title || "Welcome screen"} />
          ) : (
            <button type="button" onClick={() => { updateForm({ settings: { welcome: { ...form.settings.welcome, enabled: true } } }); setSelected("welcome"); }}
              className="mb-1 flex w-full items-center justify-between rounded-lg border border-dashed border-line px-3 py-2 text-[13px] text-ink-2 hover:bg-hover">
              Add Welcome Screen <Icon name="plus" size={15} />
            </button>
          )}
          <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={form.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <ol>
                {form.questions.map((q, i) => (
                  <SortableRow key={q.id} q={q} index={i} active={selected === q.id} onSelect={() => setSelected(q.id)}
                    onDuplicate={() => duplicateQuestion(q)} onDelete={() => onDelete(q)} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          <button type="button" onClick={onAdd}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[14px] text-ink-2 hover:bg-hover">
            <Icon name="plus" size={15} /> Add content
          </button>
        </div>
      </section>
      <section className="rounded-xl bg-panel p-3">
        <h2 className="px-2 pb-2 pt-1 text-[15px] font-medium text-ink">Endings</h2>
        <Row active={selected === "end"} onClick={() => setSelected("end")}
          tile={<span className="inline-flex h-6 items-center rounded-md bg-tile-screen px-1.5 text-[#3c323e]"><Icon name="end" size={15} /></span>}
          title={form.settings.thank_you.title || "Thank you screen"} />
      </section>
    </aside>
  );
}

function SortableRow({ q, index, active, onSelect, onDuplicate, onDelete }: {
  q: Question; index: number; active: boolean; onSelect: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${isDragging ? "z-10 opacity-90 shadow-lg" : ""}`} {...attributes} {...listeners}
      aria-label={`Question ${index + 1}: ${q.title || "Untitled"}. Press space to drag.`}>
      <Row active={active} onClick={onSelect} tile={<TypeTile type={q.type} label={index + 1} />} title={q.title}
        actions={
          <Menu align="right" items={[
            { label: "Duplicate", icon: "copy", onClick: onDuplicate },
            { label: "Delete", icon: "trash", onClick: onDelete, danger: true, divider: true },
          ]} trigger={(open) => (
            <button type="button" aria-label="Question actions" onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); open(); }}
              className="grid size-6 place-items-center rounded-md text-ink-2 opacity-0 hover:bg-hover group-hover:opacity-100 focus:opacity-100">
              <Icon name="more" size={18} strokeWidth={3} />
            </button>
          )} />
        } />
    </li>
  );
}

function Row({ active, onClick, tile, title, actions }: {
  active: boolean; onClick: () => void; tile: React.ReactNode; title: string; actions?: React.ReactNode;
}) {
  return (
    <div onClick={onClick} role="button" tabIndex={-1}
      className={`group mb-1 flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 transition ${active ? "bg-surface shadow-sm ring-1 ring-line" : "hover:bg-hover"}`}>
      {tile}
      <span className={`line-clamp-2 flex-1 pt-0.5 text-[13px] leading-snug ${title ? "text-ink" : "italic text-ink-3"}`}>{title || "..."}</span>
      {actions}
    </div>
  );
}
