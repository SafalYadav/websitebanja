"use client";

import { Button } from "@/components/ui/button";
import { getLenis } from "@/components/SmoothScroll";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const scrollTo = (target: string) => {
  
  getLenis()?.scrollTo(target, {
    duration: 0.45,
    offset: -90,
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });
};

export default function Navbar() {
  const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* Logo */}

        <button
          onClick={() => scrollTo("#home")}
          className="flex cursor-pointer items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500 font-bold text-white shadow-lg">
            W
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              WebsiteBanja
            </h1>

            <p className="-mt-1 text-xs text-zinc-500">
              AI Website Builder
            </p>
          </div>
        </button>

        {/* Navigation */}

        <nav className="hidden items-center gap-10 md:flex">

          <button
            onClick={() => scrollTo("#features")}
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Features
          </button>

          <button
            onClick={() => scrollTo("#templates")}
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Templates
          </button>

          <button
            onClick={() => scrollTo("#pricing")}
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Pricing
          </button>

          <button
            onClick={() => scrollTo("#faq")}
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            FAQ
          </button>

        </nav>

        {/* Desktop Buttons */}

<div className="hidden items-center gap-3 md:flex">
  <Button
    variant="ghost"
    className="text-white hover:bg-white/10"
  >
    Login
  </Button>

  <Button
  onClick={() => router.push("/builder")}
  className="rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-6 shadow-lg transition hover:scale-105"
>
  Start Free
</Button>
</div>

{/* Mobile Menu Button */}

<button
  onClick={() => setIsOpen(!isOpen)}
  className="rounded-xl p-2 text-white transition hover:bg-white/10 md:hidden"
>
  {isOpen ? <X size={26} /> : <Menu size={26} />}
</button>

      </div>
      {isOpen && (
  <div className="absolute left-0 top-20 w-full border-b border-white/10 bg-black/95 backdrop-blur-2xl md:hidden">
    <div className="flex flex-col gap-6 p-6">

      <button
        onClick={() => {
          scrollTo("#features");
          setIsOpen(false);
        }}
        className="text-left text-lg text-white"
      >
        Features
      </button>

      <button
        onClick={() => {
          scrollTo("#templates");
          setIsOpen(false);
        }}
        className="text-left text-lg text-white"
      >
        Templates
      </button>

      <button
        onClick={() => {
          scrollTo("#pricing");
          setIsOpen(false);
        }}
        className="text-left text-lg text-white"
      >
        Pricing
      </button>

      <button
        onClick={() => {
          scrollTo("#faq");
          setIsOpen(false);
        }}
        className="text-left text-lg text-white"
      >
        FAQ
      </button>

      <Button
        onClick={() => {
          scrollTo("#pricing");
          setIsOpen(false);
        }}
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600"
      >
        Start Free
      </Button>

    </div>
  </div>
)}
    </header>
  );
}