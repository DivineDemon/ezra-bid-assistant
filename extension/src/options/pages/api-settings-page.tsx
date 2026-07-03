import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "../../hooks/use-toast";
import { FormActions, PageHeader, PageSection } from "../../layouts/app-shell-layout";
import { checkHealth } from "../../lib/api";
import { loadSettings, updateSettings } from "../../lib/storage";

export function ApiSettingsPage() {
  const { showToast } = useToast();
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
    <PageSection>
      <PageHeader
        title="API Settings"
        description="Point the extension at your private backend. Gemini credentials stay on the server only."
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="backend-api-url">Backend API URL</Label>
            <Input
              id="backend-api-url"
              type="url"
              value={backendApiUrl}
              onChange={(event) => setBackendApiUrl(event.target.value)}
              placeholder="http://localhost:3000"
            />
            <p className="text-xs text-muted-foreground">
              Requests go to POST /api/generate-bid on this host.
            </p>
          </div>

          <FormActions>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save API Settings"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? "Testing…" : "Test Connection"}
            </Button>
          </FormActions>
        </CardContent>
      </Card>
    </PageSection>
  );
}
