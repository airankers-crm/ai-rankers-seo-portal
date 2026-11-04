import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Rankers | SEO Client Portal",
  description: "A clear, client-friendly view of SEO performance and progress.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
