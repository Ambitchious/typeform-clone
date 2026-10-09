import { notFound } from "next/navigation";
import { Results } from "@/components/results/Results";
import { api, ApiError } from "@/lib/api";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const form = await api.form(Number((await params).id)).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  return <Results form={form} />;
}
