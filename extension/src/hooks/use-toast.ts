import { useCallback } from "react";
import { toast } from "sonner";

export type ToastKind = "success" | "error";

export function useToast() {
  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    if (kind === "error") {
      toast.error(message);
      return;
    }
    toast.success(message);
  }, []);

  return { showToast };
}
