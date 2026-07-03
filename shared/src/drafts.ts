import type { GenerateBidRequest } from "./api";

/** A proposal draft saved locally via chrome.storage.local */
export interface SavedDraft {
  id: string;
  projectTitle: string;
  date: string;
  proposalStyle: string;
  generatedProposal: string;
  originalProjectDetails: GenerateBidRequest;
}
