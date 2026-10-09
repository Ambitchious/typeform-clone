import type { Metadata } from "next";
import { FormRunner } from "@/components/respondent/FormRunner";
import { api, ApiError } from "@/lib/api";
import type { PublicForm } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<PublicForm | null> {
  try {
    return await api.publicForm(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

// Server-rendered so a link pasted into WhatsApp or Slack previews with the form's title.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const form = await load((await params).slug);
  const title = form?.title ?? "Typeform";
  const description = form?.settings.welcome.description || "Fill out this form — it only takes a minute.";
  return { title, description, openGraph: { title, description, type: "website" } };
}

export default async function PublicFormPage({ params }: Params) {
  const form = await load((await params).slug);
  if (!form) {
    return (
      <main className="grid h-dvh place-items-center bg-white px-6 text-center text-[#262627]">
        <div>
          <h1 className="text-[28px]">This typeform is now closed</h1>
          <p className="mt-2 text-[18px] opacity-70">It isn&apos;t accepting new responses — please contact the person who shared it.</p>
        </div>
      </main>
    );
  }
  return (
    <main className="h-dvh">
      <FormRunner form={form} />
    </main>
  );
}
