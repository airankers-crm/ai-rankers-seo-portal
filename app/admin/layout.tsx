import type { ReactNode } from "react";

// Every admin route reads the authenticated session and must render per request.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
