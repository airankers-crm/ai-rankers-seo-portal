import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Rankers | SEO Client Portal",
  description: "Client portal and agency workspace for SEO reporting and delivery operations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
