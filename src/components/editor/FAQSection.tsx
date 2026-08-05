import { FAQ } from "@/types/website";

interface Props {
  faq: FAQ[];
}

export default function FAQSection({ faq }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-10 py-24">

      <h2 className="mb-10 text-5xl font-bold">
        Frequently Asked Questions
      </h2>

      <div className="space-y-6">

        {faq.map((item, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h3 className="text-xl font-semibold">
              {item.question}
            </h3>

            <p className="mt-3 text-zinc-400">
              {item.answer}
            </p>
          </div>
        ))}

      </div>

    </section>
  );
}