"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { FormSummary } from "@/lib/types";
import { publicUrl } from "../builder/TopBar";
import { Icon } from "../icons";
import { Button, DarkModeToggle, IconButton, Menu, Modal, relativeTime } from "../ui";

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
      router.push(`/forms/${form.id}/edit`);
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

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-[#c26a3d] text-[15px] font-semibold text-white">S</span>
          <span className="text-[15px] text-ink">My account</span>
        </div>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <span className="grid size-8 place-items-center rounded-full bg-[#f2d6a2] text-[13px] font-semibold text-[#3c323e]">SG</span>
        </div>
      </header>

      <div className="mx-4 mb-4 flex min-h-0 flex-1 overflow-hidden rounded-2xl bg-panel">
        <aside className="hidden w-[256px] shrink-0 flex-col gap-4 border-r border-line p-4 md:flex">
          <Button variant="primary" icon="plus" className="!h-9 w-full" onClick={create} disabled={creating}>Create form</Button>
          <label className="flex h-9 items-center gap-2 rounded-lg px-2 text-ink-2 focus-within:bg-surface">
            <Icon name="search" size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search forms"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none" />
          </label>
          <div>
            <p className="px-2 pb-2 text-[13px] text-ink-3">Workspaces</p>
            <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-[14px] shadow-sm">
              My workspace <span className="text-ink-3">{forms.length}</span>
            </div>
          </div>
          <div className="mt-auto rounded-lg p-2 text-[13px] text-ink-2">
            <p>Responses collected</p>
            <p className="mt-1 text-[15px] text-ink">{forms.reduce((n, f) => n + f.response_count, 0)}</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-6 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <h1 className="text-[24px] text-ink">My workspace</h1>
            <div className="flex items-center gap-2">
              <Button variant="primary" icon="plus" className="md:hidden" onClick={create}>Create</Button>
              <label className="relative">
                <Icon name="clock" size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-2" />
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort forms"
                  className="h-8 appearance-none rounded-lg border border-line bg-surface pl-8 pr-8 text-[14px] text-ink-2 outline-none">
                  {Object.entries(SORTS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
                </select>
                <Icon name="down" size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-2" />
              </label>
              <div className="flex rounded-lg border border-line bg-surface p-0.5">
                {(["list", "grid"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}
                    className={`rounded-md px-2.5 py-1 text-[13px] capitalize ${view === v ? "bg-hover text-ink" : "text-ink-2"}`}>{v}</button>
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
              <thead className="text-left text-[13px] text-ink-2">
                <tr>
                  <th className="px-3 font-normal"><span className="sr-only">Form</span></th>
                  <th className="hidden w-28 font-normal sm:table-cell">Responses</th>
                  <th className="hidden w-28 font-normal md:table-cell">Completion</th>
                  <th className="hidden w-36 font-normal lg:table-cell">Updated</th>
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
                    <td className="hidden text-ink-2 lg:table-cell">{relativeTime(f.updated_at)}</td>
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
    <span className="grid size-9 shrink-0 place-items-center rounded-lg text-[14px] font-semibold"
      style={{ background: f.theme.background_color, color: f.theme.question_color, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }}>
      {f.title.trim()[0]?.toUpperCase() ?? "?"}
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
