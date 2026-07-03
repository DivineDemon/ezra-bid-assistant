import { DEFAULT_SETTINGS, type ExtensionSettings, type SavedDraft } from "@ezra/shared";

export const SETTINGS_KEY = "ezra-settings";
export const DRAFTS_KEY = "ezra-drafts";

const LEGACY_SETTINGS_KEY = "ezra_settings";
const LEGACY_DRAFTS_KEY = "ezra_drafts";

async function migrateLegacyStorage(): Promise<void> {
  const legacy = await chrome.storage.local.get([LEGACY_SETTINGS_KEY, LEGACY_DRAFTS_KEY]);
  const updates: Record<string, unknown> = {};
  const removals: string[] = [];

  if (legacy[LEGACY_SETTINGS_KEY] !== undefined) {
    updates[SETTINGS_KEY] = legacy[LEGACY_SETTINGS_KEY];
    removals.push(LEGACY_SETTINGS_KEY);
  }

  if (legacy[LEGACY_DRAFTS_KEY] !== undefined) {
    updates[DRAFTS_KEY] = legacy[LEGACY_DRAFTS_KEY];
    removals.push(LEGACY_DRAFTS_KEY);
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }

  if (removals.length > 0) {
    await chrome.storage.local.remove(removals);
  }
}

export async function loadSettings(): Promise<ExtensionSettings> {
  await migrateLegacyStorage();
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const stored = result[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function updateSettings(
  partial: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await saveSettings(next);
  return next;
}

export async function loadDrafts(): Promise<SavedDraft[]> {
  await migrateLegacyStorage();
  const result = await chrome.storage.local.get(DRAFTS_KEY);
  return (result[DRAFTS_KEY] as SavedDraft[] | undefined) ?? [];
}

export async function saveDraft(draft: SavedDraft): Promise<void> {
  const drafts = await loadDrafts();
  drafts.unshift(draft);
  await chrome.storage.local.set({ [DRAFTS_KEY]: drafts });
}

export async function deleteDraft(id: string): Promise<void> {
  const drafts = await loadDrafts();
  await chrome.storage.local.set({
    [DRAFTS_KEY]: drafts.filter((draft) => draft.id !== id),
  });
}

export interface StorageChangePayload {
  settings?: ExtensionSettings;
  drafts?: SavedDraft[];
}

/** Subscribe to settings/drafts changes from any extension surface. */
export function subscribeToStorageChanges(
  callback: (changes: StorageChangePayload) => void,
): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== "local") return;

    const payload: StorageChangePayload = {};

    if (SETTINGS_KEY in changes) {
      const stored = changes[SETTINGS_KEY].newValue as Partial<ExtensionSettings> | undefined;
      payload.settings = { ...DEFAULT_SETTINGS, ...stored };
    }

    if (DRAFTS_KEY in changes) {
      payload.drafts = (changes[DRAFTS_KEY].newValue as SavedDraft[] | undefined) ?? [];
    }

    if (payload.settings || payload.drafts) {
      callback(payload);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
