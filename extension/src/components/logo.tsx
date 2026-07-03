import { Atom } from "lucide-react";
import { cn } from "@/lib/utils";

const iconSizes = {
  sm: "size-4",
  md: "size-5",
  lg: "size-7",
} as const;

const badgeSizes = {
  sm: "size-8 rounded-lg p-1.5",
  md: "size-9 rounded-lg p-1.5",
  lg: "size-12 rounded-xl p-2.5",
} as const;

const textSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-3xl",
} as const;

interface LogoProps {
  title?: string;
  size?: keyof typeof iconSizes;
  className?: string;
  textClassName?: string;
  showText?: boolean;
}

export function Logo({
  title = "Ezra Bid Assistant",
  size = "md",
  className,
  textClassName,
  showText = true,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-primary/15 ring-1 ring-primary/25",
          badgeSizes[size],
        )}
        aria-hidden
      >
        <Atom className={cn(iconSizes[size], "text-primary")} strokeWidth={2.25} />
      </span>
      {showText && (
        <span
          className={cn("font-heading font-semibold leading-none", textSizes[size], textClassName)}
        >
          {title}
        </span>
      )}
    </div>
  );
}
