interface ProgressBarProps {
  step: number;
}

const steps = [
  "Business",
  "Branding",
  "Content",
  "Contact",
  "Review",
];

export default function ProgressBar({
  step,
}: ProgressBarProps) {
  return (
    <div className="mb-10">

      <div className="flex items-center justify-between text-sm">

        {steps.map((item, index) => (
          <span
            key={item}
            className={
              index <= step
                ? "font-semibold text-white"
                : "text-zinc-500"
            }
          >
            {item}
          </span>
        ))}

      </div>

      <div className="mt-4 h-2 rounded-full bg-white/10">

        <div
          className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 transition-all duration-500"
          style={{
            width: `${((step + 1) / steps.length) * 100}%`,
          }}
        />

      </div>

    </div>
  );
}