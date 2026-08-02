import { ReactNode } from "react";

interface BuilderLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function BuilderLayout({
  title,
  description,
  children,
}: BuilderLayoutProps) {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-20">

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">

          <h1 className="text-4xl font-bold">
            {title}
          </h1>

          <p className="mt-3 text-zinc-400">
            {description}
          </p>

          <div className="mt-10">
            {children}
          </div>

        </div>

      </div>
    </main>
  );
}