import type { ReactNode } from "react";

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
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">Ezra Bid Assistant</div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${activeRoute === item.id ? " active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <p className="sidebar-footer-meta">v1.0.0 · Manifest V3 · No auto-submit</p>
          <a
            className="sidebar-footer-link"
            href={setupGuideUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Setup guide
          </a>
        </footer>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
