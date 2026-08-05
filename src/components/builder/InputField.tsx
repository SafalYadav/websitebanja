import { ChangeEvent } from "react";

interface InputFieldProps {
  label: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function InputField({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: InputFieldProps) {
  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-zinc-300">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-violet-500"
      />
    </div>
  );
}