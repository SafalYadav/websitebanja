import { ChangeEvent } from "react";

interface InputFieldProps {
  label: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export default function InputField({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required,
}: InputFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full rounded-2xl border px-5 py-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition bg-zinc-50 dark:bg-black/40 dark:text-white dark:placeholder:text-zinc-500 ${
          error
            ? "border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            : "border-zinc-200 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:focus:border-violet-500 dark:focus:ring-violet-500/30"
        }`}
      />

      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p>
      ) : null}
    </div>
  );
}