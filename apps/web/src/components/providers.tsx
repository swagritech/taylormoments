"use client";

import type { ReactNode } from "react";
import { DemoStateProvider } from "@/lib/demo-state";

export function Providers({ children }: { children: ReactNode }) {
  return <DemoStateProvider>{children}</DemoStateProvider>;
}
