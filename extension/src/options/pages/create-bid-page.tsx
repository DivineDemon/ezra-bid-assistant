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
import { useToast } from "../../hooks/use-toast";
import { FieldGroup, PageHeader, PageSection } from "../../layouts/app-shell-layout";
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
  const { showToast } = useToast();
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
    <PageSection>
      <PageHeader
        title="Create Bid"
        description="Enter project details manually when you are not on a Freelancer project page."
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="project-title">Project title</Label>
            <Input
              id="project-title"
              type="text"
              value={form.projectTitle}
              onChange={(event) => updateField("projectTitle", event.target.value)}
              placeholder="Project title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Project description</Label>
            <Textarea
              id="project-description"
              rows={6}
              value={form.projectDescription}
              onChange={(event) => updateField("projectDescription", event.target.value)}
              placeholder="Project description"
            />
          </div>

          <FieldGroup>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                type="text"
                value={form.budget}
                onChange={(event) => updateField("budget", event.target.value)}
                placeholder="Budget"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                type="text"
                value={form.skills}
                onChange={(event) => updateField("skills", event.target.value)}
                placeholder="Skills / tags"
              />
            </div>
          </FieldGroup>

          <FieldGroup>
            <div className="space-y-2">
              <Label htmlFor="client-country">Client country</Label>
              <Input
                id="client-country"
                type="text"
                value={form.clientCountry}
                onChange={(event) => updateField("clientCountry", event.target.value)}
                placeholder="If known"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-type">Project type</Label>
              <Input
                id="project-type"
                type="text"
                value={form.projectType}
                onChange={(event) => updateField("projectType", event.target.value)}
                placeholder="Fixed / hourly"
              />
            </div>
          </FieldGroup>

          <div className="space-y-2">
            <Label htmlFor="extra-instructions">Extra instructions</Label>
            <Textarea
              id="extra-instructions"
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
            <CardTitle>Generated proposal</CardTitle>
            {loading && <Badge variant="secondary">Loading…</Badge>}
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Button type="button" variant="secondary" onClick={handleGenerate} disabled={loading}>
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
            <p className="text-xs text-muted-foreground">
              Insert Into Bid Box is available from the side panel on Freelancer.com.
            </p>
          </CardContent>
        </Card>
      )}
    </PageSection>
  );
}
