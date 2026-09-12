"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, Sparkles, Command, ArrowRight } from "lucide-react";

export interface CommandItem {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isControlled = typeof externalIsOpen !== "undefined";
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;
  const onClose = () => {
    if (isControlled && externalOnClose) externalOnClose();
    else setInternalIsOpen(false);
  };

  const commands: CommandItem[] = [
    { id: "1", label: "Inspect Design Tokens (--wb-*)", category: "System", shortcut: "T", action: () => alert("Opened Token Inspector") },
    { id: "2", label: "Toggle Dark / Light Contrast Mode", category: "Theme", shortcut: "D", action: () => alert("Toggled Theme") },
    { id: "3", label: "Trigger Spatial 3D Perspective", category: "Motion", shortcut: "S", action: () => alert("Triggered 3D Perspective") },
    { id: "4", label: "Run Automated WCAG 2.2 Audit", category: "Audit", shortcut: "A", action: () => alert("Audit Running...") },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase())
  );

  // Global Cmd+K Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isControlled && externalOnClose && !isOpen) {
          // Open if external provides toggle
        } else {
          setInternalIsOpen((prev) => !prev);
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isControlled, externalOnClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setInternalIsOpen(true)}
        className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/15 text-xs text-zinc-400 hover:text-white flex items-center gap-3 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <span className="flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quick Actions...</span>
        </span>
        <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-zinc-950/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-zinc-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 border-b border-white/10">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            placeholder="Type a command or search tokens..."
            className="w-full bg-transparent px-3 py-4 text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white transition-colors"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="p-4 text-xs text-center text-zinc-500 font-mono">No matching commands found.</p>
          ) : (
            filtered.map((cmd, i) => {
              const isSelected = i === selectedIdx;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs cursor-pointer transition-colors ${
                    isSelected ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-medium">{cmd.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-white/5 bg-zinc-950/50 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>Navigate with arrows</span>
          <span>ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
}
