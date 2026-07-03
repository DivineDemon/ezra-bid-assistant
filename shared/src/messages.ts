import type { ExtractedProject, ProjectExtractionMeta } from "./project";

/** Chrome runtime messages between content script, service worker, and UI */
export type ExtensionMessage =
  | { type: "OPEN_SIDE_PANEL" }
  | { type: "GET_CURRENT_PROJECT" }
  | { type: "REFRESH_CURRENT_PROJECT" }
  | { type: "EXTRACT_PROJECT" }
  | {
      type: "PROJECT_DETECTED";
      project: ExtractedProject;
      extraction?: ProjectExtractionMeta;
    }
  | { type: "PROJECT_NOT_DETECTED"; extraction?: ProjectExtractionMeta }
  | { type: "INSERT_PROPOSAL"; proposal: string };

export type ExtensionMessageResponse =
  | {
      success: true;
      project?: ExtractedProject | null;
      extraction?: ProjectExtractionMeta;
    }
  | { success: false; error: string };
