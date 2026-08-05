import { ChangeEvent } from "react";

interface TextAreaFieldProps {
  label: string;
  placeholder: string;
  rows?: number;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

export default function TextAreaField({
  label,
  placeholder,
  rows = 5,
  value,
  onChange,
}: TextAreaFieldProps) {
  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-zinc-300">
        {label}
      </label>

      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-violet-500"
      />
    </div>
  );
}