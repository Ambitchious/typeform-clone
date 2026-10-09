"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { FormDetail, QuestionSummary, ResponseItem, Summary } from "@/lib/types";
import { TopBar } from "../builder/TopBar";
import { Icon } from "../icons";
import { Button, IconButton, TypeTile } from "../ui";

type View = "summary" | "responses";
type Filter = "completed" | "in_progress" | "all";

export function Results({ form }: { form: FormDetail }) {
  const [view, setView] = useState<View>("summary");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [version, setVersion] = useState(0); // bump to reload after generating or deleting

  useEffect(() => {
    api.summary(form.id).then(setSummary).catch(() => toast.error("Couldn't load results"));
  }, [form.id, version]);

  const generate = async () => {
    try {
      await api.generateResponse(form.id);
      setVersion((v) => v + 1);
      toast.success("Test response added");
    } catch {
      toast.error("Couldn't generate a response");
    }
  };

  return (
    <div className="flex h-dvh flex-col">
      <TopBar form={form} tab="results" />
      <div className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-panel">
        <div className="flex flex-wrap items-center gap-1 border-b border-line px-6">
          {(["summary", "responses"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`-mb-px border-b-2 px-3 py-3.5 text-[14px] ${view === v ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
              {v === "summary" ? "Summary" : `Responses${summary ? ` (${summary.performance.submissions})` : ""}`}
            </button>
          ))}
          <div className="ml-auto flex gap-2 py-2">
            <Button icon="sparkle" onClick={generate}>Generate test response</Button>
            <a href={api.csvUrl(form.id)} download
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[14px] font-medium text-ink-2 hover:bg-hover">
              <Icon name="download" size={16} />Download CSV
            </a>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view === "summary" ? <SummaryView summary={summary} /> : <ResponsesView form={form} version={version} onChange={() => setVersion((v) => v + 1)} />}
        </div>
      </div>
    </div>
  );
}

function SummaryView({ summary }: { summary: Summary | null }) {
  const [percent, setPercent] = useState(false);
  if (!summary) return <Skeleton />;
  const p = summary.performance;
  const kpis: [string, string][] = [
    ["Views", String(p.views)],
    ["Starts", String(p.starts)],
    ["Submissions", String(p.submissions)],
    ["Completion rate", p.completion_rate == null ? "—" : `${Math.round(p.completion_rate * 100)}%`],
    ["Time to complete", p.avg_seconds == null ? "—" : `${Math.floor(p.avg_seconds / 60)}:${String(p.avg_seconds % 60).padStart(2, "0")}`],
  ];
  return (
    <div className="mx-auto max-w-[1040px] p-6">
      <h2 className="text-[20px]">Form performance</h2>
      <p className="text-[14px] text-ink-2">Key metrics that show how your form is doing.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-surface p-4">
            <p className="text-[13px] text-ink-2">{label}</p>
            <p className="mt-5 text-[30px] leading-none">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-end justify-between">
        <div>
          <h2 className="text-[20px]">Response summary</h2>
          <p className="text-[14px] text-ink-2">A breakdown of completed responses for each question.</p>
        </div>
        <div className="flex rounded-lg border border-line bg-surface p-0.5 text-[13px]" role="group" aria-label="Show as">
          {[false, true].map((v) => (
            <button key={String(v)} type="button" aria-pressed={percent === v} onClick={() => setPercent(v)}
              className={`rounded-md px-2.5 py-1 ${percent === v ? "bg-hover text-ink" : "text-ink-2"}`}>{v ? "%" : "#"}</button>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {summary.questions.map((q, i) => <QuestionCard key={q.id} q={q} index={i} percent={percent} />)}
      </div>
    </div>
  );
}

function QuestionCard({ q, index, percent }: { q: QuestionSummary; index: number; percent: boolean }) {
  const max = Math.max(1, ...(q.counts ?? []).map((c) => c.count));
  const answeredTotal = (q.counts ?? []).reduce((n, c) => n + c.count, 0) || 1;
  return (
    <section className="rounded-xl bg-surface p-5">
      <div className="flex items-start gap-3">
        <TypeTile type={q.type} label={index + 1} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px]">{q.title || "Untitled question"}</h3>
          <p className="text-[13px] text-ink-3">{q.answered} out of {q.total} people answered this question</p>
        </div>
        {q.average != null && (
          <div className="text-right">
            <p className="text-[24px] leading-none">{q.average}</p>
            <p className="text-[12px] text-ink-3">average{q.min != null ? ` · ${q.min}–${q.max}` : ""}</p>
          </div>
        )}
      </div>
      {q.total === 0 ? (
        <p className="py-8 text-center text-[14px] text-ink-3">Waiting for responses — your data will appear here.</p>
      ) : q.counts ? (
        <ul className="mt-4 space-y-2">
          {q.counts.map((c) => (
            <li key={c.label} className="grid grid-cols-[minmax(80px,180px)_1fr_64px] items-center gap-3 text-[14px]">
              <span className="truncate text-ink-2" title={c.label}>{q.type === "rating" ? `${"★".repeat(Number(c.label))}` : c.label}</span>
              <span className="h-7 overflow-hidden rounded-md bg-canvas">
                <motion.span className="block h-full rounded-md bg-[#c9c3f5] dark:bg-[#6c5fd6]" initial={{ width: 0 }}
                  animate={{ width: `${(c.count / max) * 100}%` }} transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }} />
              </span>
              <span className="text-right tabular-nums">{percent ? `${Math.round((c.count / answeredTotal) * 100)}%` : c.count}</span>
            </li>
          ))}
        </ul>
      ) : q.latest && q.latest.length > 0 ? (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {q.latest.map((text, i) => (
            <li key={i} className="px-3 py-2 text-[14px] text-ink-2">
              {q.type === "file_upload" ? <a href={api.fileUrl(text)} className="underline" target="_blank" rel="noreferrer">{text.split("/")[1]}</a> : text}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ResponsesView({ form, version, onChange }: { form: FormDetail; version: number; onChange: () => void }) {
  const [filter, setFilter] = useState<Filter>("completed");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: ResponseItem[] } | null>(null);
  const [open, setOpen] = useState<ResponseItem | null>(null);

  const load = useCallback(() => {
    api.responses(form.id, filter, page).then(setData).catch(() => toast.error("Couldn't load responses"));
  }, [form.id, filter, page]);
  useEffect(load, [load, version]);

  const columns = form.questions.slice(0, 4);
  const pages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1;

  const remove = async (r: ResponseItem) => {
    setOpen(null);
    try {
      await api.deleteResponse(form.id, r.id);
      toast.success("Response deleted");
      onChange();
    } catch {
      toast.error("Couldn't delete the response");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        {([["completed", "Completed"], ["in_progress", "Partial"], ["all", "All"]] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => { setFilter(v); setPage(1); }} aria-pressed={filter === v}
            className={`rounded-full border px-3 py-1 text-[13px] ${filter === v ? "border-ink bg-ink text-surface" : "border-line text-ink-2 hover:bg-hover"}`}>{label}</button>
        ))}
        <span className="ml-auto text-[13px] text-ink-3">{data ? `${data.total} response${data.total === 1 ? "" : "s"}` : ""}</span>
      </div>
      {!data ? <Skeleton /> : data.items.length === 0 ? (
        <div className="grid place-items-center py-20 text-center">
          <p className="text-[18px]">No responses</p>
          <p className="mt-1 text-[14px] text-ink-2">Share your form to start collecting data, or generate a test response.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="border-b border-line text-[13px] text-ink-2">
              <tr>
                <th className="px-4 py-3 font-normal">{filter === "in_progress" ? "Started" : "Submitted"}</th>
                {columns.map((q) => <th key={q.id} className="max-w-[220px] truncate px-4 py-3 font-normal">{q.title || "Untitled"}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => {
                const byQ = new Map(r.answers.map((a) => [a.question_id, a.value]));
                return (
                  <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer border-b border-line last:border-0 hover:bg-hover">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                      {formatDate(r.completed_at ?? r.started_at)}
                      {r.status === "in_progress" && <span className="ml-2 rounded-full bg-tile-other px-2 py-px text-[11px] text-[#3c323e]">Partial</span>}
                    </td>
                    {columns.map((q) => <td key={q.id} className="max-w-[220px] truncate px-4 py-3">{display(byQ.get(q.id))}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-[13px] text-ink-2">
          <IconButton icon="left" label="Previous page" disabled={page === 1} onClick={() => setPage(page - 1)} />
          Page {page} of {pages}
          <IconButton icon="right" label="Next page" disabled={page === pages} onClick={() => setPage(page + 1)} />
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.aside role="dialog" aria-label="Response details" onClick={(e) => e.stopPropagation()}
              initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.2 }}
              className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-surface shadow-2xl">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <div>
                  <h2 className="text-[17px]">Response #{open.id}</h2>
                  <p className="text-[13px] text-ink-3">{open.status === "completed" ? `Submitted ${formatDate(open.completed_at!)}` : `Started ${formatDate(open.started_at)} · not submitted`}</p>
                </div>
                <IconButton icon="x" label="Close" onClick={() => setOpen(null)} />
              </div>
              <ol className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {form.questions.map((q, i) => {
                  const answer = open.answers.find((a) => a.question_id === q.id);
                  return (
                    <li key={q.id}>
                      <p className="flex items-center gap-2 text-[13px] text-ink-2"><TypeTile type={q.type} label={i + 1} size="sm" />{q.title || "Untitled"}</p>
                      <p className={`mt-1.5 whitespace-pre-line pl-1 text-[15px] ${answer ? "" : "italic text-ink-3"}`}>
                        {answer ? (q.type === "file_upload"
                          ? <a className="underline" href={api.fileUrl(String(answer.value))} target="_blank" rel="noreferrer">{String(answer.value).split("/")[1]}</a>
                          : display(answer.value)) : "No answer"}
                      </p>
                    </li>
                  );
                })}
              </ol>
              <div className="border-t border-line px-6 py-3">
                <Button variant="ghost" icon="trash" className="!text-[#c4381c]" onClick={() => remove(open)}>Delete response</Button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const display = (v: ResponseItem["answers"][number]["value"] | undefined) =>
  v === undefined ? <span className="text-ink-3">–</span> : Array.isArray(v) ? v.join(", ") : v === "yes" ? "Yes" : v === "no" ? "No" : String(v);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Skeleton() {
  return (
    <div className="space-y-3 p-6" aria-busy>
      {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />)}
    </div>
  );
}
