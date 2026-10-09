import { Dashboard } from "@/components/dashboard/Dashboard";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <Dashboard initial={await api.forms()} />;
}
