"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { FormDetail } from "@/lib/types";
import { Icon } from "../icons";
import { Button, DarkModeToggle, Modal } from "../ui";

export type Tab = "content" | "workflow" | "connect" | "results";
const TABS: { id: Tab; label: string; href: (id: number) => string }[] = [
  { id: "content", label: "Content", href: (id) => `/forms/${id}/edit` },
  { id: "workflow", label: "Workflow", href: (id) => `/forms/${id}/edit?tab=workflow` },
  { id: "connect", label: "Connect", href: (id) => `/forms/${id}/edit?tab=connect` },
  { id: "results", label: "Results", href: (id) => `/forms/${id}/results` },
];

export const publicUrl = (slug: string) => `${typeof window === "undefined" ? "" : window.location.origin}/f/${slug}`;

interface Props {
  form: Pick<FormDetail, "id" | "title" | "status" | "slug">;
  tab: Tab;
  saving?: boolean;
  onRename?: (title: string) => void;
  onPublish?: (publish: boolean) => Promise<unknown>;
}

export function TopBar({ form, tab, saving, onRename, onPublish }: Props) {
  const [title, setTitle] = useState(form.title);
  const [shareOpen, setShareOpen] = useState(false);
  useEffect(() => setTitle(form.title), [form.title]);

  const commit = () => {
    const clean = title.trim();
    if (!clean) return setTitle(form.title);
    if (clean !== form.title) onRename?.(clean);
  };

  const publish = async () => {
    const saved = await onPublish?.(true);
    if (saved) setShareOpen(true);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 px-4">
      <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-[14px] text-ink-2" aria-label="Breadcrumb">
        <Link href="/" className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-hover"><Icon name="forms" size={16} />Forms</Link>
        <Icon name="right" size={14} className="shrink-0 opacity-60" />
        {onRename ? (
          <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commit} aria-label="Form name" size={Math.max(title.length, 6)}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setTitle(form.title); e.currentTarget.blur(); } }}
            className="min-w-0 max-w-[260px] truncate rounded-md bg-transparent px-1.5 py-1 text-ink outline-none hover:bg-hover focus:bg-surface focus:ring-1 focus:ring-line" />
        ) : (
          <span className="truncate text-ink">{form.title}</span>
        )}
        {saving !== undefined && (
          <span className="ml-1 hidden text-[12px] text-ink-3 md:inline" aria-live="polite">{saving ? "Saving…" : "Saved"}</span>
        )}
      </nav>

      <div className="flex h-full items-stretch" role="tablist">
        {TABS.map((t) => (
          <Link key={t.id} href={t.href(form.id)} role="tab" aria-selected={tab === t.id}
            className={`relative flex items-center px-3 text-[15px] transition ${tab === t.id ? "text-ink" : "text-ink-2 hover:text-ink"}`}>
            {t.label}
            {tab === t.id && <span className="absolute inset-x-3 top-0 h-[3px] rounded-b bg-ink" />}
          </Link>
        ))}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <DarkModeToggle />
        {form.status === "published" ? (
          <Button icon="link" onClick={() => setShareOpen(true)}>Share</Button>
        ) : (
          <Button variant="primary" onClick={publish} disabled={!onPublish}>Publish</Button>
        )}
      </div>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share your form" width={520}
        footer={<>
          <Button variant="ghost" onClick={async () => { await onPublish?.(false); setShareOpen(false); }}>Unpublish</Button>
          <Button variant="primary" onClick={() => setShareOpen(false)}>Done</Button>
        </>}>
        {form.slug && (
          <>
            <p className="mb-3 text-[14px] text-ink-2">Anyone with this link can fill out your form — no login needed.</p>
            <div className="flex gap-2">
              <input readOnly value={publicUrl(form.slug)} onFocus={(e) => e.target.select()} aria-label="Public link"
                className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink outline-none" />
              <Button variant="primary" icon="copy" className="!h-9"
                onClick={() => navigator.clipboard.writeText(publicUrl(form.slug!)).then(() => toast.success("Link copied"))}>Copy</Button>
            </div>
            <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[14px] text-ink-2 underline underline-offset-4">
              Open form <Icon name="external" size={14} />
            </a>
          </>
        )}
      </Modal>
    </header>
  );
}
