"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const savedTheme = localStorage.getItem("wb_theme") as Theme | null;
      if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
        return savedTheme;
      }
    } catch {
      // Ignore
    }
    return "dark";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      let activeTheme: "light" | "dark" = "dark";

      if (theme === "system") {
        activeTheme = mediaQuery.matches ? "dark" : "light";
      } else {
        activeTheme = theme;
      }

      setResolvedTheme(activeTheme);

      if (activeTheme === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
        root.style.colorScheme = "dark";
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      }
    }

    applyTheme();

    const listener = () => {
      if (theme === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("wb_theme", newTheme);
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
