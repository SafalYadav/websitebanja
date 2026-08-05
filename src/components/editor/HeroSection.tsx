interface HeroSectionProps {
  title: string;
  subtitle: string;
  button: string;
}

export default function HeroSection({
  title,
  subtitle,
  button,
}: HeroSectionProps) {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-10 text-center">

      <h1 className="text-6xl font-bold">
        {title}
      </h1>

      <p className="mt-6 max-w-3xl text-xl text-zinc-400">
        {subtitle}
      </p>

      <button className="mt-10 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-8 py-4 font-semibold text-white">
        {button}
      </button>

    </section>
  );
}