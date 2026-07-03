import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      {children}
      <Toaster position="bottom-center" richColors closeButton />
    </>
  );
}
