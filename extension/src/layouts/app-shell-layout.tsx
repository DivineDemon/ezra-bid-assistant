import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type OptionsRoute = "create" | "prompt-settings" | "drafts" | "api-settings";

const NAV_ITEMS: { id: OptionsRoute; label: string }[] = [
  { id: "create", label: "Create Bid" },
  { id: "prompt-settings", label: "Prompt Settings" },
  { id: "drafts", label: "Saved Drafts" },
  { id: "api-settings", label: "API Settings" },
];

interface AppShellLayoutProps {
  activeRoute: OptionsRoute;
  onNavigate: (route: OptionsRoute) => void;
  setupGuideUrl: string;
  children: ReactNode;
}

export function AppShellLayout({
  activeRoute,
  onNavigate,
  setupGuideUrl,
  children,
}: AppShellLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-5">
        <Logo className="mb-6 text-sidebar-foreground" textClassName="text-sidebar-foreground" />
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={activeRoute === item.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                activeRoute === item.id &&
                  "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90",
              )}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </nav>
        <footer className="flex flex-col gap-2 text-xs text-muted-foreground">
          <p className="m-0">v1.0.0 · Manifest V3 · No auto-submit</p>
          <a
            className="font-medium text-primary hover:underline"
            href={setupGuideUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Setup guide
          </a>
        </footer>
      </aside>
      <main className="flex-1 overflow-auto p-8 md:p-10">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-6 space-y-2">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </header>
  );
}

export function PageSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("space-y-4", className)}>{children}</section>;
}

export function FieldGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

export function FormActions({ children }: { children: ReactNode }) {
  return (
    <>
      <Separator className="my-2" />
      <div className="flex flex-wrap gap-2">{children}</div>
    </>
  );
}
