"use client";

import { UploadCloud } from "lucide-react";

interface UploadFieldProps {
  label: string;
  multiple?: boolean;
}

export default function UploadField({
  label,
  multiple = false,
}: UploadFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
        {label}
      </label>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-8 transition hover:border-violet-500 hover:bg-violet-50/50 dark:border-white/15 dark:bg-black/30 dark:hover:border-violet-500/60 dark:hover:bg-violet-950/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-200/70 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 mb-2">
          <UploadCloud className="h-6 w-6" />
        </div>

        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
          Drag & Drop files here
        </h3>

        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          or click to browse from device
        </p>

        <input
          type="file"
          multiple={multiple}
          className="hidden"
        />
      </label>
    </div>
  );
}