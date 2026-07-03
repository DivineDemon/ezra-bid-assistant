import { useEffect, useState } from "react";
import { ToastStack } from "../../components/toast-stack";
import { useToast } from "../../hooks/use-toast";
import { checkHealth } from "../../lib/api";
import { loadSettings, updateSettings } from "../../lib/storage";

export function ApiSettingsPage() {
  const { toasts, showToast } = useToast();
  const [backendApiUrl, setBackendApiUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadSettings().then((settings) => {
      setBackendApiUrl(settings.backendApiUrl);
    });
  }, []);

  const handleSave = async () => {
    const trimmed = backendApiUrl.trim();
    if (!trimmed) {
      showToast("Backend URL is required.", "error");
      return;
    }

    setSaving(true);
    try {
      await updateSettings({ backendApiUrl: trimmed });
      showToast("API settings saved.");
    } catch {
      showToast("Could not save API settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const trimmed = backendApiUrl.trim();
    if (!trimmed) {
      showToast("Enter a backend URL first.", "error");
      return;
    }

    setTesting(true);
    try {
      await checkHealth(trimmed);
      showToast("Connection successful.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      showToast(message, "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <h1>API Settings</h1>
        <p className="page-lead">
          Point the extension at your private backend. OpenAI credentials stay on the server only.
        </p>
      </header>

      <section className="card form-card">
        <label className="field">
          <span className="field-label">Backend API URL</span>
          <input
            type="url"
            value={backendApiUrl}
            onChange={(event) => setBackendApiUrl(event.target.value)}
            placeholder="http://localhost:3000"
          />
          <span className="field-hint">Requests go to POST /api/generate-bid on this host.</span>
        </label>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save API Settings"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? "Testing…" : "Test Connection"}
          </button>
        </div>
      </section>

      <ToastStack toasts={toasts} />
    </>
  );
}
