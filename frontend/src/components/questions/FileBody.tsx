"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Icon } from "../icons";
import type { BodyProps } from "./types";

/** The answer stored is the server's file key ("<hex>/<name>"); the file itself lives on the API. */
export function FileBody({ value, onChange, edit, slug }: BodyProps & { slug?: string }) {
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const key = typeof value === "string" ? value : null;

  const upload = async (file: File | undefined) => {
    if (!file || !slug) return toast.error(slug ? "No file selected" : "Uploads work on the published form");
    if (file.size > 10 * 1024 * 1024) return toast.error("That file is too large — 10MB max");
    setBusy(true);
    try {
      onChange((await api.upload(slug, file)).key);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  if (key) {
    return (
      <div className="tf-choice max-w-[720px] justify-between !py-3">
        <span className="flex items-center gap-2"><Icon name="file" size={20} />{key.split("/")[1]}</span>
        <button type="button" onClick={() => onChange(null)} className="text-[14px] underline">Remove</button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files[0]); }}
      className={`flex h-[160px] max-w-[720px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-[14px] transition ${dragging ? "scale-[1.01]" : ""}`}
      style={{ borderColor: "var(--tf-a-soft)", background: "var(--tf-a-fill)", color: "var(--tf-a)" }}>
      <Icon name="upload" size={44} strokeWidth={1.2} className="opacity-60" />
      {busy ? <span>Uploading…</span> : <span><b>Choose file</b> or <b>drag here</b></span>}
      <span className="text-[12px] opacity-70">Size limit: 10MB</span>
      <input type="file" className="sr-only" disabled={!!edit || busy} onChange={(e) => upload(e.target.files?.[0])} />
    </label>
  );
}
