import { ChangeEvent } from "react";

interface SelectFieldProps {
  label: string;
  options: string[];
  value?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export default function SelectField({
  label,
  options,
  value,
  onChange,
}: SelectFieldProps) {
  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-zinc-300">
        {label}
      </label>

      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none transition focus:border-violet-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}