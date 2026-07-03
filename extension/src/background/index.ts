import type {
  ExtensionMessage,
  ExtensionMessageResponse,
  ExtractedProject,
  ProjectExtractionMeta,
} from "@ezra/shared";

const projectsByTab = new Map<number, ExtractedProject>();
const extractionByTab = new Map<number, ProjectExtractionMeta>();

function storeProject(
  tabId: number,
  project: ExtractedProject,
  extraction?: ProjectExtractionMeta,
): void {
  projectsByTab.set(tabId, project);
  if (extraction) {
    extractionByTab.set(tabId, extraction);
  }
}

function getProjectForTab(tabId: number | undefined): ExtractedProject | null {
  if (tabId === undefined) return null;
  return projectsByTab.get(tabId) ?? null;
}

function getExtractionForTab(tabId: number | undefined): ProjectExtractionMeta | undefined {
  if (tabId === undefined) return undefined;
  return extractionByTab.get(tabId);
}

function relayToPanel(message: ExtensionMessage): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // Side panel may not be open yet.
  });
}

function extractFromActiveTab(sendResponse: (response: ExtensionMessageResponse) => void): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId === undefined) {
      sendResponse({ success: false, error: "No active tab" });
      return;
    }

    chrome.tabs.sendMessage(
      tabId,
      { type: "EXTRACT_PROJECT" } satisfies ExtensionMessage,
      (response: ExtensionMessageResponse | undefined) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error:
              chrome.runtime.lastError.message ??
              "Could not read the Freelancer page. Open a project page and try again.",
          });
          return;
        }

        if (!response?.success) {
          sendResponse(response ?? { success: false, error: "No response from content script" });
          return;
        }

        if (response.project) {
          storeProject(tabId, response.project, response.extraction);
        } else {
          projectsByTab.delete(tabId);
          extractionByTab.delete(tabId);
        }

        if (
          response.project &&
          (response.project.projectTitle || response.project.projectDescription)
        ) {
          relayToPanel({
            type: "PROJECT_DETECTED",
            project: response.project,
            extraction: response.extraction,
          });
        } else {
          relayToPanel({
            type: "PROJECT_NOT_DETECTED",
            extraction: response.extraction,
          });
        }

        sendResponse(response);
      },
    );
  });
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender,
    sendResponse: (response: ExtensionMessageResponse) => void,
  ) => {
    if (message.type === "PROJECT_DETECTED") {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        storeProject(tabId, message.project, message.extraction);
      }
      relayToPanel(message);
      sendResponse({ success: true, project: message.project, extraction: message.extraction });
      return true;
    }

    if (message.type === "PROJECT_NOT_DETECTED") {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        projectsByTab.delete(tabId);
        if (message.extraction) {
          extractionByTab.set(tabId, message.extraction);
        } else {
          extractionByTab.delete(tabId);
        }
      }
      relayToPanel(message);
      sendResponse({ success: true, extraction: message.extraction });
      return true;
    }

    if (message.type === "GET_CURRENT_PROJECT") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        const project = getProjectForTab(tabId);
        sendResponse({
          success: true,
          project,
          extraction: getExtractionForTab(tabId),
        });
      });
      return true;
    }

    if (message.type === "REFRESH_CURRENT_PROJECT") {
      extractFromActiveTab(sendResponse);
      return true;
    }

    if (message.type === "OPEN_SIDE_PANEL") {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId !== undefined) {
          await chrome.sidePanel.open({ tabId });
        }
        sendResponse({ success: true });
      });
      return true;
    }

    if (message.type === "INSERT_PROPOSAL") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId === undefined) {
          sendResponse({ success: false, error: "No active tab" });
          return;
        }
        chrome.tabs.sendMessage(
          tabId,
          message,
          (response: ExtensionMessageResponse | undefined) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message ?? "Failed to insert proposal",
              });
              return;
            }
            sendResponse(response ?? { success: false, error: "No response from content script" });
          },
        );
      });
      return true;
    }

    return false;
  },
);

chrome.tabs.onRemoved.addListener((tabId) => {
  projectsByTab.delete(tabId);
  extractionByTab.delete(tabId);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
