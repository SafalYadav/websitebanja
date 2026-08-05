interface AboutSectionProps {
  title: string;
  content: string;
}

export default function AboutSection({
  title,
  content,
}: AboutSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-10 py-24">

      <h2 className="text-5xl font-bold">
        {title}
      </h2>

      <p className="mt-8 text-lg leading-8 text-zinc-400">
        {content}
      </p>

    </section>
  );
}