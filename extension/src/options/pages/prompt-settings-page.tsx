import {
  DEFAULT_SETTINGS,
  type ExtensionSettings,
  PROPOSAL_LENGTHS,
  PROPOSAL_STYLES,
  type ProposalLength,
  type ProposalStyle,
} from "@ezra/shared";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { FieldGroup, FormActions, PageHeader, PageSection } from "../../layouts/app-shell-layout";
import { loadSettings, updateSettings } from "../../lib/storage";

export function PromptSettingsPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState<Pick<
    ExtensionSettings,
    | "defaultSignOff"
    | "companyName"
    | "servicesOffered"
    | "defaultProposalStyle"
    | "defaultProposalLength"
    | "defaultClosingLine"
    | "wordsToAvoid"
    | "defaultProposalRules"
  > | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings().then((settings) => {
      setForm({
        defaultSignOff: settings.defaultSignOff,
        companyName: settings.companyName,
        servicesOffered: settings.servicesOffered,
        defaultProposalStyle: settings.defaultProposalStyle,
        defaultProposalLength: settings.defaultProposalLength,
        defaultClosingLine: settings.defaultClosingLine,
        wordsToAvoid: settings.wordsToAvoid,
        defaultProposalRules: settings.defaultProposalRules,
      });
    });
  }, []);

  const updateField = <K extends keyof NonNullable<typeof form>>(
    field: K,
    value: NonNullable<typeof form>[K],
  ) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await updateSettings(form);
      showToast("Prompt settings saved.");
    } catch {
      showToast("Could not save prompt settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({
      defaultSignOff: DEFAULT_SETTINGS.defaultSignOff,
      companyName: DEFAULT_SETTINGS.companyName,
      servicesOffered: DEFAULT_SETTINGS.servicesOffered,
      defaultProposalStyle: DEFAULT_SETTINGS.defaultProposalStyle,
      defaultProposalLength: DEFAULT_SETTINGS.defaultProposalLength,
      defaultClosingLine: DEFAULT_SETTINGS.defaultClosingLine,
      wordsToAvoid: DEFAULT_SETTINGS.wordsToAvoid,
      defaultProposalRules: DEFAULT_SETTINGS.defaultProposalRules,
    });
    showToast("Defaults restored — click Save to apply.");
  };

  if (!form) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  return (
    <PageSection>
      <PageHeader
        title="Prompt Settings"
        description="Defaults used when generating proposals in the side panel or Create Bid."
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="sign-off">Sign-off name</Label>
            <Input
              id="sign-off"
              type="text"
              value={form.defaultSignOff}
              onChange={(event) => updateField("defaultSignOff", event.target.value)}
              placeholder="Kind regards, Desmond"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              type="text"
              value={form.companyName}
              onChange={(event) => updateField("companyName", event.target.value)}
              placeholder="Ezra Global"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="services-offered">Services offered</Label>
            <Textarea
              id="services-offered"
              rows={3}
              value={form.servicesOffered}
              onChange={(event) => updateField("servicesOffered", event.target.value)}
              placeholder="Brief summary of services to weave into proposals"
            />
          </div>

          <FieldGroup>
            <div className="space-y-2">
              <Label>Default proposal style</Label>
              <Select
                value={form.defaultProposalStyle}
                onValueChange={(value) =>
                  updateField("defaultProposalStyle", value as ProposalStyle)
                }
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
              <Label>Default proposal length</Label>
              <Select
                value={form.defaultProposalLength}
                onValueChange={(value) =>
                  updateField("defaultProposalLength", value as ProposalLength)
                }
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

          <div className="space-y-2">
            <Label htmlFor="closing-line">Default closing line</Label>
            <Textarea
              id="closing-line"
              rows={2}
              value={form.defaultClosingLine}
              onChange={(event) => updateField("defaultClosingLine", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="words-to-avoid">Words to avoid</Label>
            <Textarea
              id="words-to-avoid"
              rows={2}
              value={form.wordsToAvoid}
              onChange={(event) => updateField("wordsToAvoid", event.target.value)}
              placeholder="Comma-separated words or phrases"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposal-rules">Default proposal rules</Label>
            <Textarea
              id="proposal-rules"
              rows={10}
              className="min-h-52"
              value={form.defaultProposalRules}
              onChange={(event) => updateField("defaultProposalRules", event.target.value)}
            />
          </div>

          <FormActions>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Prompt Settings"}
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset}>
              Reset to defaults
            </Button>
          </FormActions>
        </CardContent>
      </Card>
    </PageSection>
  );
}
