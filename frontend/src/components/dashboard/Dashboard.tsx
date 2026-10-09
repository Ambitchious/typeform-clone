"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { FormSummary } from "@/lib/types";
import { publicUrl } from "../builder/TopBar";
import { Icon } from "../icons";
import { Button, DarkModeToggle, IconButton, Menu, Modal, PremiumBadge, relativeTime } from "../ui";

type Sort = "updated" | "created" | "title";
const SORTS: Record<Sort, [string, (a: FormSummary, b: FormSummary) => number]> = {
  updated: ["Last updated", (a, b) => b.updated_at.localeCompare(a.updated_at)],
  created: ["Date created", (a, b) => b.created_at.localeCompare(a.created_at)],
  title: ["Alphabetical", (a, b) => a.title.localeCompare(b.title)],
};

export function Dashboard({ initial }: { initial: FormSummary[] }) {
  const router = useRouter();
  const [forms, setForms] = useState(initial);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("updated");
  const [view, setView] = useState<"list" | "grid">("list");
  const [renaming, setRenaming] = useState<FormSummary | null>(null);
  const [deleting, setDeleting] = useState<FormSummary | null>(null);
  const [creating, setCreating] = useState(false);

  const shown = useMemo(
    () => forms.filter((f) => f.title.toLowerCase().includes(query.trim().toLowerCase())).sort(SORTS[sort][1]),
    [forms, query, sort],
  );

  const create = async () => {
    setCreating(true);
    try {
      const form = await api.createForm();
      router.push(`/forms/${form.id}/edit?start=1`);
    } catch {
      toast.error("Couldn't create a form");
      setCreating(false);
    }
  };

  const duplicate = async (f: FormSummary) => {
    try {
      const copy = await api.duplicateForm(f.id);
      setForms((list) => [copy, ...list]);
      toast.success(`Duplicated “${f.title}”`);
    } catch {
      toast.error("Couldn't duplicate the form");
    }
  };

  const remove = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    setForms((list) => list.filter((f) => f.id !== target.id));
    try {
      await api.deleteForm(target.id);
      toast.success(`Deleted “${target.title}”`);
    } catch {
      setForms((list) => [...list, target]);
      toast.error("Couldn't delete the form");
    }
  };

  const menu = (f: FormSummary) => [
    ...(f.slug && f.status === "published"
      ? [{ label: "Copy link", icon: "link" as const, onClick: () => navigator.clipboard.writeText(publicUrl(f.slug!)).then(() => toast.success("Link copied")) }]
      : []),
    { label: "Content", icon: "forms" as const, onClick: () => router.push(`/forms/${f.id}/edit`), divider: !!f.slug && f.status === "published" },
    { label: "Workflow", icon: "branch" as const, onClick: () => router.push(`/forms/${f.id}/edit?tab=workflow`) },
    { label: "Results", icon: "chart" as const, onClick: () => router.push(`/forms/${f.id}/results`) },
    { label: "Rename", icon: "longText" as const, onClick: () => setRenaming(f), divider: true },
    { label: "Duplicate", icon: "copy" as const, onClick: () => duplicate(f) },
    { label: "Delete", icon: "trash" as const, onClick: () => setDeleting(f), danger: true, divider: true },
  ];

  const soon = (what: string) => () => toast(`${what} is coming soon`);
  const total = forms.reduce((n, f) => n + f.response_count, 0);

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <header className="flex h-14 shrink-0 items-center justify-between px-4">
        <button type="button" onClick={soon("Switching accounts")} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-hover">
          <span className="h-7 w-2.5 rounded-full bg-ink" aria-hidden />
          <span className="grid size-8 place-items-center rounded-lg bg-[#c26a3d] text-[15px] font-semibold text-white">S</span>
          <span className="text-[15px] text-ink">My account</span>
          <Icon name="down" size={16} className="text-ink-2" />
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" icon="apps" onClick={soon("Integrations")} className="max-sm:hidden">Integrations</Button>
          <Button variant="ghost" icon="briefcase" onClick={soon("Brand kit")} className="max-sm:hidden">Brand kit</Button>
          <DarkModeToggle />
          <a href="https://github.com/Ambitchious/typeform-clone#readme" target="_blank" rel="noreferrer" aria-label="Help" title="Help"
            className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-hover hover:text-ink"><Icon name="help" size={18} /></a>
          <span className="ml-1 grid size-8 place-items-center rounded-full bg-[#f2d6a2] text-[13px] font-semibold text-[#3c323e]">SG</span>
        </div>
      </header>

      <div className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm bg-canvas">
        <nav className="flex h-14 shrink-0 items-stretch gap-1 overflow-x-auto border-b border-line px-3" aria-label="Sections">
          {([["forms", "Forms"], ["users", "Contacts"], ["zap", "Automations"], ["chart", "Insights"], ["file", "Pages"]] as const).map(([icon, label], i) => (
            <button key={label} type="button" onClick={i ? soon(label) : undefined} aria-current={!i ? "page" : undefined}
              className={`relative flex shrink-0 items-center gap-2 px-2.5 text-[14px] ${i ? "text-ink-2 hover:text-ink" : "text-ink"}`}>
              <Icon name={icon} size={17} />{label}
              {label === "Insights" && <PremiumBadge />}
              {label === "Pages" && <span className="rounded-md border border-[#8db4e8] px-1.5 text-[12px] text-[#2f5e9e]">Beta</span>}
              {!i && <span className="absolute inset-x-2.5 bottom-0 h-[3px] rounded-t bg-ink" />}
            </button>
          ))}
          <span className="mx-2 my-4 w-px bg-line" />
          <button type="button" onClick={soon("Research Flow")} className="flex shrink-0 items-center gap-2 px-2.5 text-[14px] text-ink-2 hover:text-ink">
            <Icon name="search" size={17} />Research Flow
          </button>
        </nav>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[256px] shrink-0 flex-col border-r border-line md:flex">
            <div className="border-b border-line p-4">
              <Button variant="primary" icon="plus" className="!h-9 w-full" onClick={create} disabled={creating}>Create form</Button>
            </div>
            <label className="flex h-14 items-center gap-2 border-b border-line px-5 text-ink-2">
              <Icon name="search" size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search forms"
                className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none" />
            </label>
            <div className="p-4">
              <div className="flex items-center justify-between pb-2 pl-1">
                <span className="flex items-center gap-2 text-[14px] text-ink"><Icon name="grid" size={16} /> Workspaces</span>
                <IconButton icon="plus" label="New workspace" onClick={soon("Multiple workspaces")} className="border border-line bg-surface" />
              </div>
              <p className="flex items-center justify-between px-1 py-2 text-[14px] text-ink-2">Private <Icon name="up" size={14} /></p>
              <div className="flex items-center justify-between rounded-lg bg-hover px-3 py-2 text-[14px] text-ink">
                My workspace <span className="text-[13px] text-ink-2">{forms.length}</span>
              </div>
            </div>
            <div className="mt-auto border-t border-line p-4 text-[14px] text-ink">
              <p>Responses collected</p>
              <div className="my-2 h-1 rounded-full bg-hover"><div className="h-full w-full rounded-full bg-ink-3" /></div>
              <p className="text-[15px]">{total} <span className="text-[13px] text-ink-2">/ unlimited</span></p>
            </div>
            <form className="p-2" onSubmit={(e) => { e.preventDefault(); toast("Typeform AI is coming soon"); }}>
              <div className="flex h-12 items-center gap-2 rounded-lg border border-[#c9b6e4] bg-surface px-3 shadow-[0_0_0_3px_#efe7fa]">
                <Icon name="mic" size={17} className="text-ink-2" /><span className="h-5 w-px bg-line" />
                <input placeholder="Ask Typeform AI" aria-label="Ask Typeform AI" className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-2" />
                <button type="submit" aria-label="Send" className="grid size-7 place-items-center rounded-md border border-line text-ink-3"><Icon name="send" size={13} /></button>
              </div>
            </form>
          </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-6 md:px-14 md:pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <div className="flex items-center gap-2">
              <h1 className="mr-1 text-[24px] text-ink">My workspace</h1>
              <IconButton icon="more" label="Workspace options" onClick={soon("Workspace settings")} />
              <Button variant="ghost" icon="users" onClick={soon("Inviting teammates")}>Invite</Button>
              <PremiumBadge />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" icon="plus" className="md:hidden" onClick={create}>Create</Button>
              <label className="relative">
                <Icon name="calendar" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort forms"
                  className="h-9 appearance-none rounded-lg border border-line bg-surface pl-9 pr-9 text-[14px] text-ink-2 outline-none">
                  {Object.entries(SORTS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
                </select>
                <Icon name="down" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-2" />
              </label>
              <div className="flex h-9 overflow-hidden rounded-lg border border-line bg-surface">
                {([["list", "list"], ["grid", "grid"]] as const).map(([v, icon]) => (
                  <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}
                    className={`flex items-center gap-1.5 px-3 text-[14px] capitalize ${view === v ? "bg-hover text-ink" : "text-ink-2"}`}>
                    <Icon name={icon} size={16} />{v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="grid place-items-center py-24 text-center">
              <div>
                <p className="text-[18px] text-ink">{query ? "No forms match your search" : "No forms yet"}</p>
                <p className="mt-1 text-[14px] text-ink-2">{query ? "Try a different name." : "Create your first form to start collecting responses."}</p>
                {!query && <Button variant="primary" icon="plus" className="mt-5" onClick={create}>Create form</Button>}
              </div>
            </div>
          ) : view === "list" ? (
            <table className="mt-4 w-full border-separate border-spacing-y-2 text-[14px]">
              <thead className="text-left text-[14px] text-ink-2">
                <tr>
                  <th className="px-3 font-normal"><span className="sr-only">Form</span></th>
                  <th className="hidden w-28 font-normal sm:table-cell">Responses</th>
                  <th className="hidden w-28 font-normal md:table-cell">Completed</th>
                  <th className="hidden w-36 font-normal lg:table-cell">Updated</th>
                  <th className="hidden w-28 font-normal lg:table-cell">Integrations</th>
                  <th className="w-12"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((f) => (
                  <tr key={f.id} className="group bg-surface shadow-[0_0_0_1px_var(--line)] transition hover:shadow-[0_0_0_1px_var(--ink-3)]">
                    <td className="rounded-l-xl p-0">
                      <Link href={`/forms/${f.id}/edit`} className="flex items-center gap-3 px-3 py-2.5">
                        <FormThumb f={f} />
                        <span className="min-w-0">
                          <span className="block truncate text-ink">{f.title}</span>
                          <StatusBadge status={f.status} />
                        </span>
                      </Link>
                    </td>
                    <td className="hidden text-ink-2 sm:table-cell">
                      <Link href={`/forms/${f.id}/results`} className="hover:underline">{f.response_count || "–"}</Link>
                    </td>
                    <td className="hidden text-ink-2 md:table-cell">{f.started_count ? `${Math.round((f.response_count / f.started_count) * 100)}%` : "–"}</td>
                    <td className="hidden text-ink-2 lg:table-cell" title={relativeTime(f.updated_at)}>
                      {new Date(f.updated_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                    </td>
                    <td className="hidden lg:table-cell">
                      <IconButton icon="apps" label="Connect integrations" onClick={soon("Integrations")} className="border border-line" />
                    </td>
                    <td className="rounded-r-xl pr-2 text-right">
                      <Menu items={menu(f)} trigger={(open) => <IconButton icon="more" label={`Actions for ${f.title}`} onClick={open} />} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {shown.map((f) => (
                <div key={f.id} className="overflow-hidden rounded-xl bg-surface shadow-[0_0_0_1px_var(--line)] transition hover:shadow-[0_0_0_1px_var(--ink-3)]">
                  <Link href={`/forms/${f.id}/edit`} className="grid h-36 place-items-center px-4 text-center text-[16px]"
                    style={{ background: f.theme.background_color, color: f.theme.question_color }}>
                    <span className="line-clamp-3">{f.title}</span>
                  </Link>
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 text-[13px] text-ink-2">
                      <StatusBadge status={f.status} /> · {f.response_count} response{f.response_count === 1 ? "" : "s"}
                    </span>
                    <Menu items={menu(f)} trigger={(open) => <IconButton icon="more" label={`Actions for ${f.title}`} onClick={open} />} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        </div>
      </div>

      <RenameModal form={renaming} onClose={() => setRenaming(null)}
        onSave={async (title) => {
          if (!renaming) return;
          const id = renaming.id;
          setRenaming(null);
          setForms((list) => list.map((f) => (f.id === id ? { ...f, title } : f)));
          await api.updateForm(id, { title }).then(() => toast.success("Form renamed")).catch(() => toast.error("Couldn't rename the form"));
        }} />
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete this form?"
        footer={<><Button onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
        <p className="text-[14px] text-ink-2">
          “{deleting?.title}” and its {deleting?.response_count ?? 0} response{deleting?.response_count === 1 ? "" : "s"} will be permanently deleted. This can&apos;t be undone.
        </p>
      </Modal>
    </div>
  );
}

function FormThumb({ f }: { f: FormSummary }) {
  return (
    <span aria-hidden className="relative size-11 shrink-0 overflow-hidden rounded-lg"
      style={{ background: f.theme.background_color, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }}>
      <span className="absolute bottom-2 left-2 h-1.5 w-5 rounded-sm" style={{ background: f.theme.button_color }} />
      <span className="absolute left-2 top-2 h-1 w-6 rounded-sm opacity-70" style={{ background: f.theme.question_color }} />
    </span>
  );
}

function StatusBadge({ status }: { status: FormSummary["status"] }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] ${status === "published" ? "text-accent" : "text-ink-3"}`}>
      <span className={`size-1.5 rounded-full ${status === "published" ? "bg-accent" : "bg-ink-3"}`} />
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}

function RenameModal({ form, onClose, onSave }: { form: FormSummary | null; onClose: () => void; onSave: (title: string) => void }) {
  const [title, setTitle] = useState("");
  const [lastId, setLastId] = useState<number | null>(null);
  if (form && form.id !== lastId) { setLastId(form.id); setTitle(form.title); }
  const submit = () => title.trim() && onSave(title.trim());
  return (
    <Modal open={!!form} onClose={onClose} title="Rename form"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit} disabled={!title.trim()}>Save</Button></>}>
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onFocus={(e) => e.target.select()} aria-label="Form name"
        onKeyDown={(e) => e.key === "Enter" && submit()} maxLength={200}
        className="h-11 w-full rounded-xl border border-ink/60 bg-surface px-3 text-[16px] text-ink outline-none focus:border-ink" />
    </Modal>
  );
}
