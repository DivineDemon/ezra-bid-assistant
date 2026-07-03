export const PROPOSAL_STYLES = [
  "Professional",
  "Premium Agency",
  "Short & Direct",
  "Confident",
  "Friendly",
] as const;

export type ProposalStyle = (typeof PROPOSAL_STYLES)[number];

export const PROPOSAL_LENGTHS = ["Short", "Medium", "Detailed"] as const;

export type ProposalLength = (typeof PROPOSAL_LENGTHS)[number];

/** Request body for POST /api/generate-bid */
export interface GenerateBidRequest {
  projectTitle: string;
  projectDescription: string;
  budget: string;
  skills: string;
  clientCountry: string;
  projectType: string;
  extraInstructions: string;
  proposalStyle: string;
  proposalLength: string;
  customPromptRules: string;
}

/** Successful response from POST /api/generate-bid */
export interface GenerateBidResponse {
  proposal: string;
}

/** Response from GET /api/health */
export interface HealthResponse {
  status: "ok";
}

export interface ApiErrorResponse {
  error: string;
}
