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
      <label className="mb-3 block text-sm font-medium text-zinc-300">
        {label}
      </label>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-black/30 px-6 py-10 transition hover:border-violet-500 hover:bg-black/40">

        <div className="text-5xl">📤</div>

        <h3 className="mt-4 text-lg font-semibold">
          Drag & Drop Files
        </h3>

        <p className="mt-2 text-sm text-zinc-400">
          or click to browse
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