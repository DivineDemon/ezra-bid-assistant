import type { GenerateBidRequest } from "./api";
import { DEFAULT_PROPOSAL_RULES } from "./settings";

const STYLE_GUIDANCE: Record<string, string> = {
  Professional: "Use a professional, polished tone.",
  "Premium Agency": "Write as a premium agency — refined, authoritative, and service-oriented.",
  "Short & Direct": "Be brief and direct. Cut filler and get to the point quickly.",
  Confident: "Sound assured and decisive without being pushy.",
  Friendly: "Use a warm, approachable tone while staying professional.",
};

const LENGTH_GUIDANCE: Record<string, string> = {
  Short: "Keep the proposal concise with tight paragraphs.",
  Medium: "Use a moderate length suitable for most Freelancer.com projects.",
  Detailed:
    "Provide richer detail and a more thorough explanation while following the paragraph rules.",
};

function field(label: string, value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? `${label}: ${trimmed}` : null;
}

/** Builds system instructions and user input for the Gemini generateContent API. */
export function buildBidPrompt(request: GenerateBidRequest): {
  instructions: string;
  input: string;
} {
  const rules = request.customPromptRules.trim() || DEFAULT_PROPOSAL_RULES;
  const style = request.proposalStyle.trim() || "Professional";
  const length = request.proposalLength.trim() || "Medium";

  const instructions = `You are an expert freelance proposal writer for Freelancer.com.

Follow the proposal rules exactly. Write only the final proposal text — no preamble, labels, markdown, headings, bullets, or meta commentary.

PROPOSAL RULES:
${rules}

STYLE (${style}): ${STYLE_GUIDANCE[style] ?? STYLE_GUIDANCE.Professional}

LENGTH (${length}): ${LENGTH_GUIDANCE[length] ?? LENGTH_GUIDANCE.Medium}`;

  const projectLines = [
    field("Project title", request.projectTitle),
    field("Project description", request.projectDescription),
    field("Budget", request.budget),
    field("Skills", request.skills),
    field("Client country", request.clientCountry),
    field("Project type", request.projectType),
    field("Extra instructions", request.extraInstructions),
  ].filter((line): line is string => line !== null);

  const input =
    projectLines.length > 0
      ? `Write a Freelancer.com proposal for this project:\n\n${projectLines.join("\n\n")}`
      : "Write a professional Freelancer.com proposal. No specific project details were provided.";

  return { instructions, input };
}
