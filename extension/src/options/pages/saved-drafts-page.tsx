import type { SavedDraft } from "@ezra/shared";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { PageHeader, PageSection } from "../../layouts/app-shell-layout";
import { deleteDraft, loadDrafts, subscribeToStorageChanges } from "../../lib/storage";

function formatDraftDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface SavedDraftsPageProps {
  onLoadDraft: (draft: SavedDraft) => void;
}

export function SavedDraftsPage({ onLoadDraft }: SavedDraftsPageProps) {
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refreshDrafts = useCallback(async () => {
    setDrafts(await loadDrafts());
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshDrafts();
    return subscribeToStorageChanges((changes) => {
      if (changes.drafts) {
        setDrafts(changes.drafts);
        setLoading(false);
      }
    });
  }, [refreshDrafts]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDraft(id);
      if (expandedId === id) setExpandedId(null);
      showToast("Draft deleted.");
    } catch {
      showToast("Could not delete draft.", "error");
    }
  };

  const handleLoad = (draft: SavedDraft) => {
    onLoadDraft(draft);
    showToast("Draft loaded into Create Bid.");
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading drafts…</p>;
  }

  return (
    <PageSection>
      <PageHeader
        title="Saved Drafts"
        description={
          drafts.length === 0
            ? "No drafts saved yet. Generate a proposal in the side panel and use Save Draft."
            : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} stored locally.`
        }
      />

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">No saved drafts</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Drafts are stored in Chrome local storage on this device only.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {drafts.map((draft) => {
            const expanded = expandedId === draft.id;
            return (
              <li key={draft.id}>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                    <div>
                      <CardTitle>{draft.projectTitle}</CardTitle>
                      <CardDescription>
                        {formatDraftDate(draft.date)} · {draft.proposalStyle}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setExpandedId(expanded ? null : draft.id)}
                      >
                        {expanded ? "Hide" : "View"}
                      </Button>
                      <Button type="button" size="sm" onClick={() => handleLoad(draft)}>
                        Load
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(draft.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardHeader>
                  {expanded && (
                    <CardContent>
                      <Textarea
                        className="min-h-48 font-mono text-sm leading-relaxed"
                        rows={12}
                        readOnly
                        value={draft.generatedProposal}
                      />
                    </CardContent>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </PageSection>
  );
}
