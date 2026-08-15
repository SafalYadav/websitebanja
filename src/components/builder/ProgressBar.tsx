interface ProgressBarProps {
  step: number;
}

const steps = [
  "Business",
  "Branding",
  "Content",
  "Contact",
  "Integrations",
  "Review",
];

export default function ProgressBar({ step }: ProgressBarProps) {
  // Clamp step between 0 and steps.length - 1
  const safeStep = Math.max(0, Math.min(step, steps.length - 1));
  const progressPercent = Math.min(100, Math.max(0, ((safeStep + 1) / steps.length) * 100));

  return (
    <div className="mb-10 w-full">
      <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
        {steps.map((item, index) => {
          const isCompleted = index < safeStep;
          const isCurrent = index === safeStep;

          return (
            <div key={item} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isCompleted
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : isCurrent
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                    : "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-white/5"
                }`}
              >
                {isCompleted ? "✓" : index + 1}
              </span>
              <span
                className={
                  isCompleted
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold hidden sm:inline"
                    : isCurrent
                    ? "text-zinc-900 dark:text-white font-bold"
                    : "text-zinc-400 dark:text-zinc-500 hidden sm:inline"
                }
              >
                {item}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 transition-all duration-300 ease-out"
          style={{
            width: `${progressPercent}%`,
          }}
        />
      </div>
    </div>
  );
}
