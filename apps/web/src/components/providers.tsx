"use client";

import type { ReactNode } from "react";
import { DemoStateProvider } from "@/lib/demo-state";
import { AuthProvider } from "@/lib/auth-state";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DemoStateProvider>{children}</DemoStateProvider>
    </AuthProvider>
  );
}
