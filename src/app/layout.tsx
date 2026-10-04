import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arendora Content OS",
  description: "AI marketing automation platform for Arendora: research, content, SEO, QA, analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
