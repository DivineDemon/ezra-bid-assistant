import {
  composePromptRules,
  type ExtractedProject,
  emptyProject,
  type GenerateBidRequest,
  PROPOSAL_LENGTHS,
  PROPOSAL_STYLES,
  type ProposalLength,
  type ProposalStyle,
  type SavedDraft,
} from "@ezra/shared";
import { useCallback, useEffect, useState } from "react";
import { ToastStack } from "../../components/toast-stack";
import { useToast } from "../../hooks/use-toast";
import { generateBid } from "../../lib/api";
import { copyTextToClipboard } from "../../lib/clipboard";
import { loadSettings, saveDraft, subscribeToStorageChanges } from "../../lib/storage";

const EMPTY_PROJECT = emptyProject();

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

interface CreateBidPageProps {
  loadedDraft: SavedDraft | null;
  onDraftConsumed: () => void;
}

export function CreateBidPage({ loadedDraft, onDraftConsumed }: CreateBidPageProps) {
  const { toasts, showToast } = useToast();
  const [form, setForm] = useState<ExtractedProject>(EMPTY_PROJECT);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [proposalStyle, setProposalStyle] = useState<ProposalStyle>("Professional");
  const [proposalLength, setProposalLength] = useState<ProposalLength>("Medium");
  const [promptRulesOverride, setPromptRulesOverride] = useState<string | null>(null);
  const [backendApiUrl, setBackendApiUrl] = useState("http://localhost:3000");
  const [proposal, setProposal] = useState("");
  const [loading, setLoading] = useState(false);

  const applySettings = useCallback((settings: Awaited<ReturnType<typeof loadSettings>>) => {
    setProposalStyle(settings.defaultProposalStyle);
    setProposalLength(settings.defaultProposalLength);
    setBackendApiUrl(settings.backendApiUrl);
    setPromptRulesOverride(null);
  }, []);

  const resolvePromptRules = useCallback(async (): Promise<string> => {
    if (promptRulesOverride !== null) {
      return promptRulesOverride;
    }
    return composePromptRules(await loadSettings());
  }, [promptRulesOverride]);

  useEffect(() => {
    loadSettings().then(applySettings);
    return subscribeToStorageChanges((changes) => {
      if (changes.settings) applySettings(changes.settings);
    });
  }, [applySettings]);

  useEffect(() => {
    if (!loadedDraft) return;

    const details = loadedDraft.originalProjectDetails;
    setForm({
      projectTitle: details.projectTitle,
      projectDescription: details.projectDescription,
      budget: details.budget,
      skills: details.skills,
      clientCountry: details.clientCountry,
      projectType: details.projectType,
    });
    setExtraInstructions(details.extraInstructions);
    setProposalStyle((details.proposalStyle as ProposalStyle) || "Professional");
    setProposalLength((details.proposalLength as ProposalLength) || "Medium");
    setPromptRulesOverride(details.customPromptRules);
    setProposal(loadedDraft.generatedProposal);
    onDraftConsumed();
  }, [loadedDraft, onDraftConsumed]);

  const updateField = (field: keyof ExtractedProject, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const body = buildRequest(
        form,
        extraInstructions,
        proposalStyle,
        proposalLength,
        await resolvePromptRules(),
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

  const handleSaveDraft = async () => {
    if (!proposal) {
      showToast("Generate a proposal before saving a draft.", "error");
      return;
    }

    const body = buildRequest(
      form,
      extraInstructions,
      proposalStyle,
      proposalLength,
      await resolvePromptRules(),
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

  return (
    <>
      <header className="page-header">
        <h1>Create Bid</h1>
        <p className="page-lead">
          Enter project details manually when you are not on a Freelancer project page.
        </p>
      </header>

      <section className="card form-card">
        <label className="field">
          <span className="field-label">Project title</span>
          <input
            type="text"
            value={form.projectTitle}
            onChange={(event) => updateField("projectTitle", event.target.value)}
            placeholder="Project title"
          />
        </label>

        <label className="field">
          <span className="field-label">Project description</span>
          <textarea
            rows={6}
            value={form.projectDescription}
            onChange={(event) => updateField("projectDescription", event.target.value)}
            placeholder="Project description"
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
              placeholder="If known"
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
          <p className="field-hint">
            Insert Into Bid Box is available from the side panel on Freelancer.com.
          </p>
        </section>
      )}

      <ToastStack toasts={toasts} />
    </>
  );
}
