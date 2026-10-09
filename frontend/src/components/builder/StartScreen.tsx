"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FormDetail } from "@/lib/types";
import { Icon } from "../icons";

/** What Typeform shows right after "Create form": an AI prompt, or start from scratch. */
export function StartScreen({ form }: { form: Pick<FormDetail, "id" | "title"> }) {
  const router = useRouter();
  const scratch = () => router.replace(`/forms/${form.id}/edit?add=1`);
  const soon = (what: string) => () => toast(`${what} is coming soon — start from scratch for now`);

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <header className="flex h-14 shrink-0 items-center justify-between px-4">
        <nav className="flex items-center gap-1.5 text-[14px] text-ink-2" aria-label="Breadcrumb">
          <Link href="/" className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-hover"><Icon name="forms" size={16} />Forms</Link>
          <Icon name="right" size={14} className="opacity-60" />
          <span className="text-ink">{form.title}</span>
        </nav>
        <div className="flex items-center gap-2">
          <a href="https://github.com/Ambitchious/typeform-clone#readme" target="_blank" rel="noreferrer" aria-label="Help"
            className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-hover hover:text-ink"><Icon name="help" size={18} /></a>
          <span className="grid size-8 place-items-center rounded-full bg-[#f2d6a2] text-[13px] font-semibold text-[#3c323e]">SG</span>
        </div>
      </header>

      <main className="mx-4 mb-4 grid flex-1 place-items-center rounded-2xl bg-canvas px-4">
        <div className="flex w-full max-w-[470px] flex-col items-center text-center">
          <p className="text-[14px] text-ink-2">Typeform AI</p>
          <h1 className="mt-2 text-[24px] text-ink">What would you like to create?</h1>
          <form className="mt-8 w-full rounded-xl p-1 shadow-[0_0_0_3px_#efe7fa]" onSubmit={(e) => { e.preventDefault(); soon("Typeform AI")(); }}>
            <div className="rounded-lg border border-[#c9b6e4] bg-surface p-3 text-left">
              <textarea autoFocus rows={4} placeholder="Explain what your form is for…" aria-label="Describe your form"
                className="w-full resize-none bg-transparent text-[14px] text-ink outline-none" />
              <div className="flex items-center gap-3 text-ink-2">
                <Icon name="mic" size={17} /><Icon name="plus" size={17} /><Icon name="more" size={17} strokeWidth={3} />
                <button type="submit" aria-label="Send" className="ml-auto grid size-7 place-items-center rounded-md border border-line text-ink-3"><Icon name="send" size={13} /></button>
              </div>
            </div>
          </form>
          <hr className="my-10 w-[90%] border-line" />
          <div className="grid w-full grid-cols-2 gap-4">
            <button type="button" onClick={scratch} className="h-11 rounded-lg bg-hover text-[14px] text-ink hover:bg-line">Start from scratch</button>
            <button type="button" onClick={soon("Syncing to a CRM")} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-hover text-[14px] text-ink hover:bg-line">
              Sync to CRM
              <span className="grid size-6 place-items-center rounded-md bg-[#ff7a59] text-[11px] font-bold text-white">H</span>
              <span className="grid size-6 place-items-center rounded-md bg-[#1798c1] text-[11px] font-bold text-white">S</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
