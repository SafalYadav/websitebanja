import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mitra — Voice & Text AI Website Architect",
  description:
    "Consult with Mitra, your conversational AI Website Architect. Plan branding, sections, color palettes, and copy with voice or text before generating your website.",
  alternates: {
    canonical: "https://websitebanja.com/agent",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://websitebanja.com/agent",
    title: "Mitra — Voice & Text AI Website Architect | WebsiteBanja",
    description:
      "Have a voice or text consultation with Mitra to brainstorm, plan, and synthesize your custom website architecture with autonomous AI.",
    siteName: "WebsiteBanja AI",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Mitra AI Website Architect",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mitra — Voice & Text AI Website Architect | WebsiteBanja",
    description:
      "Have a voice or text consultation with Mitra to brainstorm, plan, and synthesize your custom website architecture with autonomous AI.",
    images: ["/logo.png"],
  },
};

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
