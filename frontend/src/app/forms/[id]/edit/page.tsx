import { notFound } from "next/navigation";
import { Builder } from "@/components/builder/Builder";
import type { Tab } from "@/components/builder/TopBar";
import { api, ApiError } from "@/lib/api";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; q?: string }> };

export default async function EditPage({ params, searchParams }: Props) {
  const [{ id }, { tab, q }] = await Promise.all([params, searchParams]);
  const form = await api.form(Number(id)).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const active: Tab = tab === "workflow" || tab === "connect" ? tab : "content";
  // key: switching tabs re-mounts with fresh data, so the logic editor and canvas never disagree.
  return <Builder key={active} initial={form} tab={active} focusQuestion={q ? Number(q) : undefined} />;
}
