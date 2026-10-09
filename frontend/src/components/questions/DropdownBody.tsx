"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../icons";
import type { BodyProps } from "./types";

/** Typeform's dropdown is not a native <select>: it opens a panel with a search box and a
 *  filtered list you can drive with arrow keys. */
export function DropdownBody({ question, value, onChange, active, edit }: BodyProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const list = [...question.options];
    if (question.config.alphabetical) list.sort((a, b) => a.label.localeCompare(b.label));
    return list;
  }, [question.options, question.config.alphabetical]);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = options.find((o) => o.id === value);
  const placeholder = question.config.placeholder || "Type or select an option";

  useEffect(() => {
    if (active && !edit && !window.matchMedia("(pointer: coarse)").matches) inputRef.current?.focus({ preventScroll: true });
  }, [active, edit]);
  useEffect(() => setHighlight(0), [query]);

  const pick = (id: number) => {
    setOpen(false);
    setQuery("");
    onChange(id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlight((h) => (h + step + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Unlike Typeform, Enter also picks the only remaining match after typing.
      const choice = open ? filtered[highlight] : filtered.length === 1 ? filtered[0] : undefined;
      if (choice) pick(choice.id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  if (edit) {
    return (
      <div className="max-w-[720px]">
        <div className="tf-input flex items-center justify-between" style={{ color: "var(--tf-a-soft)" }}>
          {placeholder}<Icon name="down" size={20} />
        </div>
        <div className="mt-2 flex justify-between text-[13px]">
          <button type="button" className="underline underline-offset-4 opacity-80 hover:opacity-100" onClick={edit.openBulkChoices}>
            {options.length ? "Edit choices" : "Add choices"}
          </button>
          <span className="opacity-70">{options.length} option{options.length === 1 ? "" : "s"} in list</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-[720px]">
      <div className="relative">
        <input ref={inputRef} className="tf-input pr-10" role="combobox" aria-expanded={open} aria-controls={`dd-${question.id}`}
          aria-label={question.title} placeholder={selected ? selected.label : placeholder}
          value={open ? query : selected?.label ?? ""}
          onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={onKeyDown} />
        <button type="button" tabIndex={-1} aria-label="Toggle options" onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setOpen(!open); inputRef.current?.focus(); }} className="absolute right-0 top-1 p-1" style={{ color: "var(--tf-a)" }}>
          <Icon name={open ? "up" : "down"} size={24} />
        </button>
      </div>
      {open && (
        <ul id={`dd-${question.id}`} role="listbox" className="mt-3 flex max-h-[min(320px,45vh)] w-full flex-col gap-2 overflow-y-auto pb-2">
          {filtered.length === 0 && <li className="px-2 py-3 text-[16px] opacity-70">No suggestions found</li>}
          {filtered.map((o, i) => (
            <li key={o.id} role="option" aria-selected={o.id === value}
              ref={(el) => { if (i === highlight && el) el.scrollIntoView({ block: "nearest" }); }}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o.id)}
                onMouseEnter={() => setHighlight(i)}
                className="tf-choice w-full" data-selected={o.id === value}
                style={i === highlight ? { boxShadow: "inset 0 0 0 2px var(--tf-a)" } : undefined}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
