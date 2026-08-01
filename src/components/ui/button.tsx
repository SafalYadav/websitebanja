import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <a
          href="#home"
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
        </a>

        {/* Navigation */}
        <nav className="hidden items-center gap-10 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Features
          </a>

          <a
            href="#templates"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Templates
          </a>

          <a
            href="#pricing"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Pricing
          </a>

          <a
            href="#faq"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            FAQ
          </a>
        </nav>

        {/* Buttons */}
        <div className="flex items-center gap-3">

          <Button
            variant="ghost"
            onClick={() => {
              alert("Login page coming soon 🚀");
            }}
            className="text-white hover:bg-white/10"
          >
            Login
          </Button>

          <Button
            onClick={() => {
              document
                .getElementById("pricing")
                ?.scrollIntoView({
                  behavior: "smooth",
                });
            }}
            className="rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-6 shadow-lg transition hover:scale-105"
          >
            Start Free
          </Button>

        </div>

      </div>
    </header>
  );
}