import type { SavedDraft } from "@ezra/shared";
import { useCallback, useEffect, useState } from "react";
import { AppShellLayout, type OptionsRoute } from "../layouts/app-shell-layout";
import { ApiSettingsPage } from "./pages/api-settings-page";
import { CreateBidPage } from "./pages/create-bid-page";
import { PromptSettingsPage } from "./pages/prompt-settings-page";
import { SavedDraftsPage } from "./pages/saved-drafts-page";

const ROUTES: OptionsRoute[] = ["create", "prompt-settings", "drafts", "api-settings"];

const SETUP_GUIDE_URL = "https://github.com/DivineDemon/ezra-bid-assistant#readme";

function parseRoute(): OptionsRoute {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (ROUTES.includes(hash as OptionsRoute)) {
    return hash as OptionsRoute;
  }
  return "create";
}

function ensureDefaultHash() {
  if (!window.location.hash) {
    window.location.replace("#/create");
  }
}

export function App() {
  const [route, setRoute] = useState<OptionsRoute>(parseRoute);
  const [loadedDraft, setLoadedDraft] = useState<SavedDraft | null>(null);

  useEffect(() => {
    ensureDefaultHash();
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((next: OptionsRoute) => {
    window.location.hash = `#/${next}`;
    setRoute(next);
  }, []);

  const handleLoadDraft = useCallback(
    (draft: SavedDraft) => {
      setLoadedDraft(draft);
      navigate("create");
    },
    [navigate],
  );

  const handleDraftConsumed = useCallback(() => {
    setLoadedDraft(null);
  }, []);

  return (
    <AppShellLayout activeRoute={route} onNavigate={navigate} setupGuideUrl={SETUP_GUIDE_URL}>
      {route === "create" && (
        <CreateBidPage loadedDraft={loadedDraft} onDraftConsumed={handleDraftConsumed} />
      )}
      {route === "prompt-settings" && <PromptSettingsPage />}
      {route === "drafts" && <SavedDraftsPage onLoadDraft={handleLoadDraft} />}
      {route === "api-settings" && <ApiSettingsPage />}
    </AppShellLayout>
  );
}
