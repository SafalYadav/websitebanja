"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Laptop } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white/80 text-zinc-700 shadow-sm backdrop-blur-md transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="h-4 w-4 text-violet-400" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-36 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-zinc-900 z-50"
          >
            <button
              type="button"
              onClick={() => {
                setTheme("light");
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                theme === "light"
                  ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              }`}
            >
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme("dark");
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                theme === "dark"
                  ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              }`}
            >
              <Moon className="h-4 w-4 text-violet-400" />
              <span>Dark</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme("system");
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                theme === "system"
                  ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              }`}
            >
              <Laptop className="h-4 w-4 text-zinc-500" />
              <span>System</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
