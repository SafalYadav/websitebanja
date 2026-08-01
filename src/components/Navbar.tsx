import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer">
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
        </div>

        {/* Navigation */}

        <nav className="hidden items-center gap-10 md:flex">

          <a
            href="#"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Features
          </a>

          <a
            href="features"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Templates
          </a>

          <a
            href="#"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Pricing
          </a>

          <a
            href="pricing"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            FAQ
          </a>

        </nav>

        {/* Buttons */}

        <div className="flex items-center gap-3">

          <Button
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            Login
          </Button>

          <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 shadow-lg transition hover:scale-105">
            Start Free
          </Button>

        </div>

      </div>
    </header>
  );
}