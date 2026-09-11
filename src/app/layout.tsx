import type { Metadata } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ToastContainer from "@/components/ui/ToastContainer";

import JsonLd, {
  websiteJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
} from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  metadataBase: new URL("https://websitebanja.com"),
  title: {
    default: "WebsiteBanja AI — Autonomous AI Website Builder & Architect",
    template: "%s | WebsiteBanja AI",
  },
  description:
    "Build, customize, and publish stunning responsive websites in seconds with WebsiteBanja AI. Talk with Mitra, our voice-first AI Website Architect, or generate complete multi-section sites instantly.",
  keywords: [
    "WebsiteBanja AI",
    "WebsiteBanja",
    "websitebanja.com",
    "AI website builder",
    "autonomous website generator",
    "AI-native website builder",
    "Mitra AI architect",
    "voice website builder",
    "instant website maker",
    "no-code AI builder",
    "responsive web design AI",
    "Next.js website generator",
    "automated web design",
  ],
  authors: [{ name: "WebsiteBanja Team", url: "https://websitebanja.com" }],
  creator: "WebsiteBanja AI",
  publisher: "WebsiteBanja AI",
  alternates: {
    canonical: "https://websitebanja.com",
  },
  icons: {
    icon: [{ url: "/favicon.ico", type: "image/x-icon", sizes: "16x16 32x32 48x48" }],
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://websitebanja.com",
    title: "WebsiteBanja AI — Autonomous AI Website Builder & Architect",
    description:
      "Generate, customize, and publish full multi-section responsive websites with autonomous AI. Features Mitra, the real-time conversational website architect.",
    siteName: "WebsiteBanja AI",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "WebsiteBanja AI Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WebsiteBanja AI — Autonomous AI Website Builder & Architect",
    description:
      "Generate and publish stunning responsive websites in seconds with autonomous AI and Mitra, your conversational Website Architect.",
    images: ["/logo.png"],
    creator: "@websitebanja",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark antialiased" suppressHydrationWarning>
      <head>
        <JsonLd data={websiteJsonLd} />
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={softwareApplicationJsonLd} />
      </head>
      <body className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 dark:bg-[#040406] dark:text-zinc-100 transition-colors duration-200 selection:bg-cyan-500/30 selection:text-cyan-900 dark:selection:text-white">
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
