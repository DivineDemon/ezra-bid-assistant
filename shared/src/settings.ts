import type { ProposalLength, ProposalStyle } from "./api";

/** Extension settings persisted in chrome.storage.local */
export interface ExtensionSettings {
  backendApiUrl: string;
  defaultProposalRules: string;
  defaultSignOff: string;
  companyName: string;
  servicesOffered: string;
  wordsToAvoid: string;
  defaultProposalStyle: ProposalStyle;
  defaultProposalLength: ProposalLength;
  defaultClosingLine: string;
}

export const DEFAULT_CLOSING_LINE =
  "Worst case, you walk away with a free consultation and a clearer understanding of your project.";

export const DEFAULT_SIGN_OFF = "Kind regards, Desmond";

export const DEFAULT_PROPOSAL_RULES = `Write a professional Freelancer.com proposal based on the project details. Use exactly 4 short paragraphs. No headings, bullets, or lists. The tone must be professional, calm, confident, natural, and human.

Start by showing that I understand the client's project. Mention relevant experience without overclaiming. Explain the approach clearly and practically. Mention Ezra Global where natural.

Avoid generic AI wording, fake portfolio claims, exaggerated sales language, and anything that sounds desperate.

End by inviting the client to chat and include this sentence:

"${DEFAULT_CLOSING_LINE}"

End exactly with:

"${DEFAULT_SIGN_OFF}"`;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendApiUrl: "http://localhost:3000",
  defaultProposalRules: DEFAULT_PROPOSAL_RULES,
  defaultSignOff: DEFAULT_SIGN_OFF,
  companyName: "Ezra Global",
  servicesOffered: "",
  wordsToAvoid: "",
  defaultProposalStyle: "Professional",
  defaultProposalLength: "Medium",
  defaultClosingLine: DEFAULT_CLOSING_LINE,
};

export type PromptSettingsFields = Pick<
  ExtensionSettings,
  | "defaultProposalRules"
  | "defaultSignOff"
  | "companyName"
  | "servicesOffered"
  | "wordsToAvoid"
  | "defaultClosingLine"
>;

/** Merges structured prompt settings into rules sent to the backend at generation time. */
export function composePromptRules(settings: PromptSettingsFields): string {
  const base = settings.defaultProposalRules.trim() || DEFAULT_PROPOSAL_RULES;
  const additions: string[] = [];

  const company = settings.companyName.trim();
  if (company) {
    additions.push(`Represent my company as "${company}" and mention it where natural.`);
  }

  const services = settings.servicesOffered.trim();
  if (services) {
    additions.push(
      `Services I offer (mention only what fits the project, without overclaiming): ${services}`,
    );
  }

  const avoid = settings.wordsToAvoid.trim();
  if (avoid) {
    additions.push(`Do not use these words or phrases: ${avoid}`);
  }

  const closing = settings.defaultClosingLine.trim();
  if (closing) {
    additions.push(
      `Before the sign-off, invite the client to chat and include this sentence exactly:\n"${closing}"`,
    );
  }

  const signOff = settings.defaultSignOff.trim();
  if (signOff) {
    additions.push(`The final line of the proposal must be exactly:\n"${signOff}"`);
  }

  if (additions.length === 0) {
    return base;
  }

  return `${base}\n\n${additions.join("\n\n")}`;
}
