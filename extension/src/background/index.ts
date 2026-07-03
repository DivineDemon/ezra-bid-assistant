import type {
  ExtensionMessage,
  ExtensionMessageResponse,
  ExtractedProject,
  ProjectExtractionMeta,
} from "@ezra/shared";

/** Must match the content script entry in manifest.config.ts (CRXJS loader path). */
const CONTENT_SCRIPT_FILE = "src/content/index.ts-loader.js";

const projectsByTab = new Map<number, ExtractedProject>();
const extractionByTab = new Map<number, ProjectExtractionMeta>();
let sidePanelHostTabId: number | undefined;

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

function isFreelancerUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith("freelancer.com");
  } catch {
    return false;
  }
}

async function resolveFreelancerTabId(): Promise<number | undefined> {
  if (sidePanelHostTabId !== undefined) {
    try {
      const tab = await chrome.tabs.get(sidePanelHostTabId);
      if (tab.id !== undefined && isFreelancerUrl(tab.url)) {
        return tab.id;
      }
    } catch {
      sidePanelHostTabId = undefined;
    }
  }

  const [focusedTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (focusedTab?.id !== undefined && isFreelancerUrl(focusedTab.url)) {
    return focusedTab.id;
  }

  const freelancerTabs = await chrome.tabs.query({
    url: ["*://*.freelancer.com/*"],
    lastFocusedWindow: true,
  });
  return freelancerTabs[0]?.id;
}

function sendMessageToTab(
  tabId: number,
  message: ExtensionMessage,
  sendResponse: (response: ExtensionMessageResponse) => void,
): void {
  chrome.tabs.sendMessage(tabId, message, (response: ExtensionMessageResponse | undefined) => {
    if (!chrome.runtime.lastError) {
      sendResponse(response ?? { success: false, error: "No response from content script" });
      return;
    }

    void chrome.scripting
      .executeScript({
        target: { tabId },
        files: [CONTENT_SCRIPT_FILE],
      })
      .then(() => {
        chrome.tabs.sendMessage(
          tabId,
          message,
          (retryResponse: ExtensionMessageResponse | undefined) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error:
                  "Could not read the Freelancer page. Reload the project page, then try again.",
              });
              return;
            }
            sendResponse(
              retryResponse ?? { success: false, error: "No response from content script" },
            );
          },
        );
      })
      .catch(() => {
        sendResponse({
          success: false,
          error: "Could not read the Freelancer page. Reload the project page, then try again.",
        });
      });
  });
}

function handleExtractionResponse(
  tabId: number,
  response: ExtensionMessageResponse,
  sendResponse: (response: ExtensionMessageResponse) => void,
): void {
  if (!response.success) {
    sendResponse(response);
    return;
  }

  if (response.project) {
    storeProject(tabId, response.project, response.extraction);
  } else {
    projectsByTab.delete(tabId);
    extractionByTab.delete(tabId);
  }

  if (response.project && (response.project.projectTitle || response.project.projectDescription)) {
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
}

function extractFromFreelancerTab(
  sendResponse: (response: ExtensionMessageResponse) => void,
): void {
  void resolveFreelancerTabId().then((tabId) => {
    if (tabId === undefined) {
      sendResponse({
        success: false,
        error: "No Freelancer.com tab found. Open a project page and try again.",
      });
      return;
    }

    sidePanelHostTabId = tabId;

    sendMessageToTab(tabId, { type: "EXTRACT_PROJECT" } satisfies ExtensionMessage, (response) =>
      handleExtractionResponse(tabId, response, sendResponse),
    );
  });
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender,
    sendResponse: (response: ExtensionMessageResponse) => void,
  ) => {
    if (message.type === "REGISTER_SIDE_PANEL_HOST") {
      sidePanelHostTabId = message.tabId;
      sendResponse({ success: true });
      return true;
    }

    if (message.type === "PROJECT_DETECTED") {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        sidePanelHostTabId = tabId;
        storeProject(tabId, message.project, message.extraction);
      }
      relayToPanel(message);
      sendResponse({ success: true, project: message.project, extraction: message.extraction });
      return true;
    }

    if (message.type === "PROJECT_NOT_DETECTED") {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        sidePanelHostTabId = tabId;
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
      void resolveFreelancerTabId().then((tabId) => {
        sendResponse({
          success: true,
          project: getProjectForTab(tabId),
          extraction: getExtractionForTab(tabId),
        });
      });
      return true;
    }

    if (message.type === "REFRESH_CURRENT_PROJECT") {
      extractFromFreelancerTab(sendResponse);
      return true;
    }

    if (message.type === "OPEN_SIDE_PANEL") {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId !== undefined) {
          sidePanelHostTabId = tabId;
          await chrome.sidePanel.open({ tabId });
        }
        sendResponse({ success: true });
      });
      return true;
    }

    if (message.type === "INSERT_PROPOSAL") {
      void resolveFreelancerTabId().then((tabId) => {
        if (tabId === undefined) {
          sendResponse({ success: false, error: "No Freelancer.com tab found." });
          return;
        }

        sendMessageToTab(tabId, message, sendResponse);
      });
      return true;
    }

    return false;
  },
);

chrome.tabs.onRemoved.addListener((tabId) => {
  projectsByTab.delete(tabId);
  extractionByTab.delete(tabId);
  if (sidePanelHostTabId === tabId) {
    sidePanelHostTabId = undefined;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
