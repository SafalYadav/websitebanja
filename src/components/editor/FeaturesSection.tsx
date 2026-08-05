import { Feature } from "@/types/website";

interface Props {
  features: Feature[];
}

export default function FeaturesSection({
  features,
}: Props) {
  return (
    <section className="mx-auto max-w-7xl px-10 py-24">

      <h2 className="mb-10 text-5xl font-bold">
        Features
      </h2>

      <div className="grid gap-8 md:grid-cols-3">

        {features.map((feature, index) => (
          <div
            key={index}
            className="rounded-3xl border border-white/10 bg-white/5 p-8"
          >
            <h3 className="text-2xl font-bold">
              {feature.title}
            </h3>

            <p className="mt-4 text-zinc-400">
              {feature.description}
            </p>
          </div>
        ))}

      </div>

    </section>
  );
}