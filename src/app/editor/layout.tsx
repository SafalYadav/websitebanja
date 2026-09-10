import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor Studio",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EditorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
