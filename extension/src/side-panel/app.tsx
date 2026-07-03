import {
  composePromptRules,
  type ExtensionMessage,
  type ExtensionMessageResponse,
  type ExtractedProject,
  emptyProject,
  extractionStatusLabel,
  type GenerateBidRequest,
  hasProjectContent,
  PROPOSAL_LENGTHS,
  PROPOSAL_STYLES,
  type ProjectExtractionMeta,
  type ProposalLength,
  type ProposalStyle,
} from "@ezra/shared";
import { useCallback, useEffect, useState } from "react";
import { ToastStack } from "../components/toast-stack";
import { useToast } from "../hooks/use-toast";
import { generateBid } from "../lib/api";
import { copyTextToClipboard } from "../lib/clipboard";
import { loadSettings, saveDraft, subscribeToStorageChanges } from "../lib/storage";

const EMPTY_PROJECT = emptyProject();

function sendMessage<T extends ExtensionMessageResponse>(message: ExtensionMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T | undefined) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}

function buildRequest(
  form: ExtractedProject,
  extraInstructions: string,
  proposalStyle: ProposalStyle,
  proposalLength: ProposalLength,
  customPromptRules: string,
): GenerateBidRequest {
  return {
    projectTitle: form.projectTitle,
    projectDescription: form.projectDescription,
    budget: form.budget,
    skills: form.skills,
    clientCountry: form.clientCountry,
    projectType: form.projectType,
    extraInstructions,
    proposalStyle,
    proposalLength,
    customPromptRules,
  };
}

export function App() {
  const { toasts, showToast } = useToast();
  const [extraction, setExtraction] = useState<ProjectExtractionMeta | null>(null);
  const [form, setForm] = useState<ExtractedProject>(EMPTY_PROJECT);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [proposalStyle, setProposalStyle] = useState<ProposalStyle>("Professional");
  const [proposalLength, setProposalLength] = useState<ProposalLength>("Medium");
  const [backendApiUrl, setBackendApiUrl] = useState("http://localhost:3000");
  const [proposal, setProposal] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const projectDetected = hasProjectContent(form);

  const applyProject = useCallback(
    (project: ExtractedProject | null, meta?: ProjectExtractionMeta | null) => {
      setExtraction(meta ?? null);
      if (project && hasProjectContent(project)) {
        setForm(project);
      } else {
        setForm(EMPTY_PROJECT);
      }
    },
    [],
  );

  useEffect(() => {
    const applySettings = (settings: Awaited<ReturnType<typeof loadSettings>>) => {
      setProposalStyle(settings.defaultProposalStyle);
      setProposalLength(settings.defaultProposalLength);
      setBackendApiUrl(settings.backendApiUrl);
    };

    loadSettings().then(applySettings);
    const unsubscribe = subscribeToStorageChanges((changes) => {
      if (changes.settings) applySettings(changes.settings);
    });

    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId !== undefined) {
        sendMessage({ type: "REGISTER_SIDE_PANEL_HOST", tabId }).catch(() => {
          // Background may be unavailable during development hot reload.
        });
      }
    });

    sendMessage<ExtensionMessageResponse>({ type: "GET_CURRENT_PROJECT" })
      .then((response) => {
        if (response.success) {
          applyProject(response.project ?? null, response.extraction ?? null);
        }
      })
      .catch(() => {
        // Background may be unavailable during development hot reload.
      });

    const listener = (message: ExtensionMessage) => {
      if (message.type === "PROJECT_DETECTED") {
        applyProject(message.project, message.extraction ?? null);
      }
      if (message.type === "PROJECT_NOT_DETECTED") {
        applyProject(null, message.extraction ?? null);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      unsubscribe();
    };
  }, [applyProject]);

  const updateField = (field: keyof ExtractedProject, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleRefreshFromPage = async () => {
    setRefreshing(true);
    try {
      const response = await sendMessage<ExtensionMessageResponse>({
        type: "REFRESH_CURRENT_PROJECT",
      });
      if (!response.success) {
        showToast(response.error, "error");
        return;
      }
      applyProject(response.project ?? null, response.extraction ?? null);
      if (response.project && hasProjectContent(response.project)) {
        showToast("Project details refreshed from page.");
      } else {
        showToast("No project fields found — enter details manually.", "error");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh from page";
      showToast(message, "error");
    } finally {
      setRefreshing(false);
    }
  };

  const statusLabel = extraction
    ? extractionStatusLabel(extraction)
    : projectDetected
      ? "Project detected"
      : "No project detected";

  const showManualEntryHint =
    Boolean(extraction?.partial) ||
    Boolean(extraction?.isProjectPage && extraction.fieldsFound === 0) ||
    (!projectDetected && !extraction?.isProjectPage);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const settings = await loadSettings();
      const body = buildRequest(
        form,
        extraInstructions,
        proposalStyle,
        proposalLength,
        composePromptRules(settings),
      );
      const result = await generateBid(backendApiUrl, body);
      setProposal(result.proposal);
      showToast("Proposal generated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate proposal";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!proposal) return;
    const copied = await copyTextToClipboard(proposal);
    showToast(
      copied ? "Proposal copied to clipboard." : "Could not copy to clipboard.",
      copied ? "success" : "error",
    );
  };

  const handleInsert = async () => {
    if (!proposal) return;
    try {
      const response = await sendMessage<ExtensionMessageResponse>({
        type: "INSERT_PROPOSAL",
        proposal,
      });
      if (!response.success) {
        showToast(response.error, "error");
        return;
      }
      showToast("Proposal inserted. Please review and submit manually.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to insert proposal";
      showToast(message, "error");
    }
  };

  const handleSaveDraft = async () => {
    if (!proposal) {
      showToast("Generate a proposal before saving a draft.", "error");
      return;
    }

    const settings = await loadSettings();
    const body = buildRequest(
      form,
      extraInstructions,
      proposalStyle,
      proposalLength,
      composePromptRules(settings),
    );

    await saveDraft({
      id: crypto.randomUUID(),
      projectTitle: form.projectTitle || "Untitled project",
      date: new Date().toISOString(),
      proposalStyle,
      generatedProposal: proposal,
      originalProjectDetails: body,
    });
    showToast("Draft saved locally.");
  };

  const handleClear = () => {
    setProposal("");
    showToast("Proposal cleared.");
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-row">
          <h1>Ezra Bid Assistant</h1>
          <button type="button" className="link-button" onClick={openSettings}>
            Settings
          </button>
        </div>
        <p
          className={`status ${projectDetected ? "status-ok" : extraction?.isProjectPage ? "status-warn" : ""}`}
        >
          {statusLabel}
        </p>
      </header>

      <main className="main">
        {showManualEntryHint && (
          <section className="notice" role="status">
            <p>
              {extraction?.isProjectPage
                ? "Some project fields could not be read from the page. Review the fields below or fill them in manually."
                : "Open a Freelancer.com project page, or enter project details manually below."}
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              onClick={handleRefreshFromPage}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh from page"}
            </button>
          </section>
        )}

        <section className="card">
          <label className="field">
            <span className="field-label">Project title</span>
            <input
              type="text"
              value={form.projectTitle}
              onChange={(event) => updateField("projectTitle", event.target.value)}
              placeholder={
                extraction?.fieldMeta.projectTitle.found
                  ? "Extracted project title"
                  : "Enter project title manually"
              }
            />
          </label>

          <label className="field">
            <span className="field-label">Project description</span>
            <textarea
              rows={5}
              value={form.projectDescription}
              onChange={(event) => updateField("projectDescription", event.target.value)}
              placeholder={
                extraction?.fieldMeta.projectDescription.found
                  ? "Extracted project description"
                  : "Enter project description manually"
              }
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Budget</span>
              <input
                type="text"
                value={form.budget}
                onChange={(event) => updateField("budget", event.target.value)}
                placeholder="Budget"
              />
            </label>
            <label className="field">
              <span className="field-label">Skills</span>
              <input
                type="text"
                value={form.skills}
                onChange={(event) => updateField("skills", event.target.value)}
                placeholder="Skills / tags"
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Client country</span>
              <input
                type="text"
                value={form.clientCountry}
                onChange={(event) => updateField("clientCountry", event.target.value)}
                placeholder="If visible"
              />
            </label>
            <label className="field">
              <span className="field-label">Project type</span>
              <input
                type="text"
                value={form.projectType}
                onChange={(event) => updateField("projectType", event.target.value)}
                placeholder="Fixed / hourly"
              />
            </label>
          </div>

          <label className="field">
            <span className="field-label">Extra instructions</span>
            <textarea
              rows={3}
              value={extraInstructions}
              onChange={(event) => setExtraInstructions(event.target.value)}
              placeholder="Optional notes for this proposal"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Proposal style</span>
              <select
                value={proposalStyle}
                onChange={(event) => setProposalStyle(event.target.value as ProposalStyle)}
              >
                {PROPOSAL_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Proposal length</span>
              <select
                value={proposalLength}
                onChange={(event) => setProposalLength(event.target.value as ProposalLength)}
              >
                {PROPOSAL_LENGTHS.map((length) => (
                  <option key={length} value={length}>
                    {length}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate Proposal"}
          </button>
        </section>

        {(proposal || loading) && (
          <section className="card output-card">
            <div className="output-header">
              <h2>Generated proposal</h2>
              {loading && <span className="loading-badge">Loading…</span>}
            </div>
            <textarea
              className="proposal-output"
              rows={14}
              readOnly
              value={loading ? "Generating your proposal…" : proposal}
            />
            <div className="action-grid">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopy}
                disabled={!proposal}
              >
                Copy Proposal
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleInsert}
                disabled={!proposal}
              >
                Insert Into Bid Box
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGenerate}
                disabled={loading}
              >
                Regenerate
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSaveDraft}
                disabled={!proposal}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleClear}
                disabled={!proposal}
              >
                Clear
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">v1.0.0 · Manifest V3 · No auto-submit</footer>
      <ToastStack toasts={toasts} />
    </div>
  );
}
