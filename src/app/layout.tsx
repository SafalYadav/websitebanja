import type { Metadata } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ToastContainer from "@/components/ui/ToastContainer";

export const metadata: Metadata = {
  title: "WebsiteBanja AI — AI Website Builder",
  description: "Generate and customize modern websites in seconds with AI.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 transition-colors duration-200 selection:bg-violet-500/30 selection:text-violet-900 dark:selection:text-white">
        <ThemeProvider>
          <SmoothScroll>
            {children}
          </SmoothScroll>
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}
