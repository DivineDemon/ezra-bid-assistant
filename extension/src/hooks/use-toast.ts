import { useCallback, useState } from "react";

export type ToastKind = "success" | "error";

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  return { toasts, showToast };
}
