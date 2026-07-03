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
import { Logo } from "@/components/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "../hooks/use-toast";
import { FieldGroup } from "../layouts/app-shell-layout";
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
  const { showToast } = useToast();
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
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-background">
      <header className="min-w-0 border-b border-border px-4 py-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Logo size="sm" className="min-w-0 shrink" />
          <Button
            type="button"
            variant="link"
            size="sm"
            className="shrink-0"
            onClick={openSettings}
          >
            Settings
          </Button>
        </div>
        <Badge
          variant={projectDetected ? "default" : "secondary"}
          className="mt-2 h-auto w-full min-w-0 max-w-full shrink justify-start whitespace-normal px-2.5 py-1 text-left text-[10px] uppercase tracking-wider"
        >
          {statusLabel}
        </Badge>
      </header>

      <main className="flex flex-1 flex-col gap-3 p-4">
        {showManualEntryHint && (
          <Alert>
            <AlertDescription className="flex flex-col gap-3">
              <p>
                {extraction?.isProjectPage
                  ? "Some project fields could not be read from the page. Review the fields below or fill them in manually."
                  : "Open a Freelancer.com project page, or enter project details manually below."}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={handleRefreshFromPage}
                disabled={refreshing}
              >
                {refreshing ? "Refreshing…" : "Refresh from page"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="side-project-title">Project title</Label>
              <Input
                id="side-project-title"
                type="text"
                value={form.projectTitle}
                onChange={(event) => updateField("projectTitle", event.target.value)}
                placeholder={
                  extraction?.fieldMeta.projectTitle.found
                    ? "Extracted project title"
                    : "Enter project title manually"
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="side-project-description">Project description</Label>
              <Textarea
                id="side-project-description"
                rows={5}
                value={form.projectDescription}
                onChange={(event) => updateField("projectDescription", event.target.value)}
                placeholder={
                  extraction?.fieldMeta.projectDescription.found
                    ? "Extracted project description"
                    : "Enter project description manually"
                }
              />
            </div>

            <FieldGroup>
              <div className="space-y-2">
                <Label htmlFor="side-budget">Budget</Label>
                <Input
                  id="side-budget"
                  type="text"
                  value={form.budget}
                  onChange={(event) => updateField("budget", event.target.value)}
                  placeholder="Budget"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="side-skills">Skills</Label>
                <Input
                  id="side-skills"
                  type="text"
                  value={form.skills}
                  onChange={(event) => updateField("skills", event.target.value)}
                  placeholder="Skills / tags"
                />
              </div>
            </FieldGroup>

            <FieldGroup>
              <div className="space-y-2">
                <Label htmlFor="side-client-country">Client country</Label>
                <Input
                  id="side-client-country"
                  type="text"
                  value={form.clientCountry}
                  onChange={(event) => updateField("clientCountry", event.target.value)}
                  placeholder="If visible"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="side-project-type">Project type</Label>
                <Input
                  id="side-project-type"
                  type="text"
                  value={form.projectType}
                  onChange={(event) => updateField("projectType", event.target.value)}
                  placeholder="Fixed / hourly"
                />
              </div>
            </FieldGroup>

            <div className="space-y-2">
              <Label htmlFor="side-extra-instructions">Extra instructions</Label>
              <Textarea
                id="side-extra-instructions"
                rows={3}
                value={extraInstructions}
                onChange={(event) => setExtraInstructions(event.target.value)}
                placeholder="Optional notes for this proposal"
              />
            </div>

            <FieldGroup>
              <div className="space-y-2">
                <Label>Proposal style</Label>
                <Select
                  value={proposalStyle}
                  onValueChange={(value) => setProposalStyle(value as ProposalStyle)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSAL_STYLES.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proposal length</Label>
                <Select
                  value={proposalLength}
                  onValueChange={(value) => setProposalLength(value as ProposalLength)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSAL_LENGTHS.map((length) => (
                      <SelectItem key={length} value={length}>
                        {length}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FieldGroup>

            <Button type="button" className="w-full" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating…" : "Generate Proposal"}
            </Button>
          </CardContent>
        </Card>

        {(proposal || loading) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Generated proposal</CardTitle>
              {loading && <Badge variant="secondary">Loading…</Badge>}
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                className="min-h-60 font-mono text-sm leading-relaxed"
                rows={14}
                readOnly
                value={loading ? "Generating your proposal…" : proposal}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="secondary" onClick={handleCopy} disabled={!proposal}>
                  Copy Proposal
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleInsert}
                  disabled={!proposal}
                >
                  Insert Into Bid Box
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  Regenerate
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={!proposal}
                >
                  Save Draft
                </Button>
                <Button type="button" variant="ghost" onClick={handleClear} disabled={!proposal}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        v1.0.0 · Manifest V3 · No auto-submit
      </footer>
    </div>
  );
}
