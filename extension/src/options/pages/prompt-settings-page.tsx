import {
  DEFAULT_SETTINGS,
  type ExtensionSettings,
  PROPOSAL_LENGTHS,
  PROPOSAL_STYLES,
  type ProposalLength,
  type ProposalStyle,
} from "@ezra/shared";
import { useEffect, useState } from "react";
import { ToastStack } from "../../components/toast-stack";
import { useToast } from "../../hooks/use-toast";
import { loadSettings, updateSettings } from "../../lib/storage";

export function PromptSettingsPage() {
  const { toasts, showToast } = useToast();
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
    return <p className="page-lead">Loading settings…</p>;
  }

  return (
    <>
      <header className="page-header">
        <h1>Prompt Settings</h1>
        <p className="page-lead">
          Defaults used when generating proposals in the side panel or Create Bid.
        </p>
      </header>

      <section className="card form-card">
        <label className="field">
          <span className="field-label">Sign-off name</span>
          <input
            type="text"
            value={form.defaultSignOff}
            onChange={(event) => updateField("defaultSignOff", event.target.value)}
            placeholder="Kind regards, Desmond"
          />
        </label>

        <label className="field">
          <span className="field-label">Company name</span>
          <input
            type="text"
            value={form.companyName}
            onChange={(event) => updateField("companyName", event.target.value)}
            placeholder="Ezra Global"
          />
        </label>

        <label className="field">
          <span className="field-label">Services offered</span>
          <textarea
            rows={3}
            value={form.servicesOffered}
            onChange={(event) => updateField("servicesOffered", event.target.value)}
            placeholder="Brief summary of services to weave into proposals"
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Default proposal style</span>
            <select
              value={form.defaultProposalStyle}
              onChange={(event) =>
                updateField("defaultProposalStyle", event.target.value as ProposalStyle)
              }
            >
              {PROPOSAL_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Default proposal length</span>
            <select
              value={form.defaultProposalLength}
              onChange={(event) =>
                updateField("defaultProposalLength", event.target.value as ProposalLength)
              }
            >
              {PROPOSAL_LENGTHS.map((length) => (
                <option key={length} value={length}>
                  {length}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field-label">Default closing line</span>
          <textarea
            rows={2}
            value={form.defaultClosingLine}
            onChange={(event) => updateField("defaultClosingLine", event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Words to avoid</span>
          <textarea
            rows={2}
            value={form.wordsToAvoid}
            onChange={(event) => updateField("wordsToAvoid", event.target.value)}
            placeholder="Comma-separated words or phrases"
          />
        </label>

        <label className="field">
          <span className="field-label">Default proposal rules</span>
          <textarea
            rows={10}
            className="rules-textarea"
            value={form.defaultProposalRules}
            onChange={(event) => updateField("defaultProposalRules", event.target.value)}
          />
        </label>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Prompt Settings"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleReset}>
            Reset to defaults
          </button>
        </div>
      </section>

      <ToastStack toasts={toasts} />
    </>
  );
}
