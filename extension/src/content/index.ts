import type { ExtensionMessage, ExtensionMessageResponse } from "@ezra/shared";
import { atomIconSvg, EZRA_PRIMARY } from "../assets/atom-icon";
import {
  extractFreelancerProject,
  insertProposalIntoBidTextarea,
  isFreelancerProjectPage,
  shouldReportProjectDetected,
} from "./freelancer-dom";

const SCRIPT_MARKER = "__ezraBidAssistantContentScript";
const BUTTON_ID = "ezra-bid-assistant-trigger";
const OBSERVER_DEBOUNCE_MS = 750;

let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function runExtraction() {
  return extractFreelancerProject();
}

function sendProjectDetected(): void {
  const result = runExtraction();
  chrome.runtime.sendMessage({
    type: "PROJECT_DETECTED",
    project: result.project,
    extraction: result.meta,
  } satisfies ExtensionMessage);
}

function sendProjectNotDetected(): void {
  const result = runExtraction();
  chrome.runtime.sendMessage({
    type: "PROJECT_NOT_DETECTED",
    extraction: result.meta,
  } satisfies ExtensionMessage);
}

function publishProjectState(): void {
  const result = runExtraction();
  if (shouldReportProjectDetected(result)) {
    sendProjectDetected();
  } else {
    sendProjectNotDetected();
  }
}

function scheduleProjectRefresh(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    publishProjectState();
  }, OBSERVER_DEBOUNCE_MS);
}

function injectButton(): void {
  if (document.getElementById(BUTTON_ID)) return;

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.setAttribute("aria-label", "Generate Bid with Ezra");
  button.style.cssText = [
    "position:fixed",
    "bottom:24px",
    "right:24px",
    "z-index:2147483646",
    "display:inline-flex",
    "align-items:center",
    "gap:8px",
    "padding:12px 16px",
    "border:none",
    "border-radius:9999px",
    `background:${EZRA_PRIMARY}`,
    "color:#fff",
    "font:600 14px system-ui,sans-serif",
    "cursor:pointer",
    "box-shadow:0 4px 12px rgba(0,0,0,0.25)",
  ].join(";");

  const icon = document.createElement("span");
  icon.innerHTML = atomIconSvg({ size: 18, stroke: "#ffffff", strokeWidth: 2.25 });
  icon.style.display = "inline-flex";
  icon.style.lineHeight = "0";

  const label = document.createElement("span");
  label.textContent = "Generate Bid with Ezra";

  button.append(icon, label);

  button.addEventListener("click", () => {
    sendProjectDetected();
    chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" } satisfies ExtensionMessage);
  });

  document.body.appendChild(button);
}

function watchForDomChanges(): void {
  if (observer || !document.body) return;

  observer = new MutationObserver(() => {
    scheduleProjectRefresh();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function respondWithExtraction(sendResponse: (response: ExtensionMessageResponse) => void): void {
  const result = runExtraction();
  sendResponse({
    success: true,
    project: result.project,
    extraction: result.meta,
  });
}

function init(): void {
  if (!isFreelancerProjectPage()) {
    sendProjectNotDetected();
    return;
  }

  publishProjectState();
  injectButton();
  watchForDomChanges();
}

function registerMessageListener(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender,
      sendResponse: (response: ExtensionMessageResponse) => void,
    ) => {
      if (message.type === "EXTRACT_PROJECT") {
        respondWithExtraction(sendResponse);
        return true;
      }

      if (message.type === "INSERT_PROPOSAL") {
        const result = insertProposalIntoBidTextarea(message.proposal);
        sendResponse(result.success ? { success: true } : { success: false, error: result.error });
        return true;
      }

      return false;
    },
  );
}

registerMessageListener();

if (!(globalThis as Record<string, unknown>)[SCRIPT_MARKER]) {
  (globalThis as Record<string, unknown>)[SCRIPT_MARKER] = true;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
