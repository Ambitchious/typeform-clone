"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { TYPES } from "./questions/registry";
import type { QuestionType } from "@/lib/types";

// Admin UI primitives — sizes and colours measured from admin.typeform.com
// (32px buttons, 8px radius, weight 500; 16px-radius modals with a grey footer).

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-surface hover:opacity-90",
  secondary: "bg-surface text-ink-2 border border-line hover:bg-hover",
  ghost: "text-ink-2 hover:bg-hover",
  danger: "bg-[#c4381c] text-white hover:opacity-90",
};

export function Button({ variant = "secondary", icon, className = "", children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName }) {
  return (
    <button type="button" {...rest}
      className={`inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[14px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest}
      className={`grid size-8 place-items-center rounded-lg text-ink-2 transition hover:bg-hover hover:text-ink disabled:opacity-40 ${className}`}>
      <Icon name={icon} size={17} />
    </button>
  );
}

export function TypeTile({ type, label, size = "md" }: { type: QuestionType; label?: string | number; size?: "sm" | "md" }) {
  const info = TYPES[type];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md text-[#3c323e] ${info.tile} ${size === "md" ? "h-6 px-1.5" : "h-5 px-1"}`}>
      <Icon name={info.icon} size={size === "md" ? 15 : 13} />
      {label !== undefined && <span className="text-[12px] font-medium">{label}</span>}
    </span>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2 text-[14px] text-ink-2">
      <span className="flex items-center gap-1.5">{label}{hint && <span title={hint}><Icon name="help" size={14} className="text-ink-3" /></span>}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-ink" : "bg-ink/20"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-surface shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 440, bare = false }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode; width?: number;
  /** Render children edge to edge, with no title, padding or close button. */
  bare?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onMouseDown={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <motion.div role="dialog" aria-modal aria-label={title} onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.215, 0.61, 0.355, 1] }}
            className="relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_0_0_3px_rgba(84,80,88,0.09),0_24px_48px_rgba(0,0,0,0.18)]"
            style={{ maxWidth: width }}>
            {bare ? children : (
              <>
                {title && <h2 className="px-8 pt-8 text-[21px] text-ink">{title}</h2>}
                <IconButton icon="x" label="Close" onClick={onClose} className="absolute right-4 top-4" />
                <div className="overflow-y-auto px-8 pb-6 pt-4">{children}</div>
              </>
            )}
            {footer && <div className="flex justify-end gap-2 bg-canvas px-8 py-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface MenuItem { label: string; icon?: IconName; onClick: () => void; danger?: boolean; divider?: boolean }

export function Menu({ items, trigger, align = "right" }: { items: MenuItem[]; trigger: (open: () => void) => ReactNode; align?: "left" | "right" }) {
  // Fixed positioning lets the menu escape scrolling panels instead of being clipped by them.
  const [at, setAt] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!at) return;
    const close = (e: Event) => !ref.current?.contains(e.target as Node) && setAt(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAt(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", close, true);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("scroll", close, true); window.removeEventListener("keydown", esc); };
  }, [at]);
  return (
    <div ref={ref} className="relative">
      {trigger(() => setAt((a) => (a ? null : ref.current!.getBoundingClientRect())))}
      <AnimatePresence>
        {at && (
          <motion.div role="menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
            style={{ top: at.bottom + 4, ...(align === "right" ? { right: window.innerWidth - at.right } : { left: at.left }) }}
            className="fixed z-[60] min-w-[200px] rounded-xl border border-line bg-surface p-1.5 shadow-xl">
            {items.map((item) => (
              <div key={item.label}>
                {item.divider && <hr className="my-1.5 border-line" />}
                <button type="button" role="menuitem" onClick={() => { setAt(null); item.onClick(); }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] hover:bg-hover ${item.danger ? "text-[#c4381c]" : "text-ink"}`}>
                  {item.icon && <Icon name={item.icon} size={16} />}{item.label}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Typeform's green diamond, marking features that need a paid plan. */
export function PremiumBadge() {
  return (
    <span title="Paid feature" className="grid size-[22px] place-items-center rounded-full bg-[#dff2e9] text-[#0b6e4f]">
      <Icon name="diamond" size={13} />
    </span>
  );
}

export function SoonBadge() {
  return <span className="rounded-full border border-accent/40 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-accent">Soon</span>;
}

export function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const flip = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("admin-theme", next ? "dark" : "light"); } catch { /* ignore */ }
  };
  return <IconButton icon={dark ? "sun" : "moon"} label={dark ? "Light mode" : "Dark mode"} onClick={flip} />;
}

export function relativeTime(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (seconds < 60) return "just now";
  if (seconds < 3600) return fmt.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86400) return fmt.format(-Math.round(seconds / 3600), "hour");
  if (seconds < 86400 * 7) return fmt.format(-Math.round(seconds / 86400), "day");
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
