import type { SavedDraft } from "@ezra/shared";
import { useCallback, useEffect, useState } from "react";
import { ToastStack } from "../../components/toast-stack";
import { useToast } from "../../hooks/use-toast";
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
  const { toasts, showToast } = useToast();
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
    return <p className="page-lead">Loading drafts…</p>;
  }

  return (
    <>
      <header className="page-header">
        <h1>Saved Drafts</h1>
        <p className="page-lead">
          {drafts.length === 0
            ? "No drafts saved yet. Generate a proposal in the side panel and use Save Draft."
            : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} stored locally.`}
        </p>
      </header>

      {drafts.length === 0 ? (
        <section className="empty-state card">
          <p>No saved drafts</p>
          <span className="empty-state-hint">
            Drafts are stored in Chrome local storage on this device only.
          </span>
        </section>
      ) : (
        <ul className="draft-list">
          {drafts.map((draft) => {
            const expanded = expandedId === draft.id;
            return (
              <li key={draft.id} className="card draft-card">
                <div className="draft-card-header">
                  <div>
                    <h2 className="draft-title">{draft.projectTitle}</h2>
                    <p className="draft-meta">
                      {formatDraftDate(draft.date)} · {draft.proposalStyle}
                    </p>
                  </div>
                  <div className="draft-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact"
                      onClick={() => setExpandedId(expanded ? null : draft.id)}
                    >
                      {expanded ? "Hide" : "View"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact"
                      onClick={() => handleLoad(draft)}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      onClick={() => handleDelete(draft.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {expanded && (
                  <textarea
                    className="proposal-output draft-preview"
                    rows={12}
                    readOnly
                    value={draft.generatedProposal}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ToastStack toasts={toasts} />
    </>
  );
}
