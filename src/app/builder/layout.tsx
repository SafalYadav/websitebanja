import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Builder",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
