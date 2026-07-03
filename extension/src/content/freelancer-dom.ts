import {
  EXTRACTED_PROJECT_FIELDS,
  type ExtractedProjectField,
  type ExtractionFieldMeta,
  type ExtractionSource,
  emptyProject,
  hasProjectContent,
  type ProjectExtractionMeta,
  type ProjectExtractionResult,
} from "@ezra/shared";

/**
 * Freelancer.com project page DOM selectors.
 *
 * Freelancer uses React with CSS modules; class names like PageProjectView*
 * have been stable across several UI iterations but may change. Selectors are
 * ordered from most specific to broadest. Heuristic fallbacks run last.
 *
 * @see https://www.freelancer.com/projects/{category}/{slug}
 */
export const FREELANCER_SELECTORS = {
  title: [
    '[data-testid="project-title"]',
    "h1.fl-project-title",
    '[class*="PageProjectView"] h1',
    '[class*="ProjectView"] h1',
    '[class*="ProjectHeader"] h1',
    "main h1",
    "article h1",
    "h1",
  ],
  description: [
    '[data-testid="project-description"]',
    ".PageProjectViewLoggedOut-detail",
    '[class*="PageProjectView"][class*="detail"]',
    '[class*="PageProjectView"][class*="Description"]',
    '[class*="ProjectDescription"]',
    '[class*="project-description"]',
    '[itemprop="description"]',
    'section[class*="description"] p',
  ],
  budget: [
    '[data-testid="project-budget"]',
    ".PageProjectViewLoggedOut-budget",
    '[class*="PageProjectView"][class*="budget"]',
    '[class*="ProjectBudget"]',
    '[class*="project-budget"]',
    '[class*="Budget"]',
  ],
  skills: {
    containers: [
      '[data-testid="project-skills"]',
      '[class*="PageProjectViewSkills"]',
      '[class*="ProjectSkills"]',
      '[class*="skills-list"]',
      '[class*="Skills"]',
    ],
    items: [
      '[data-testid="project-skills"] span',
      '[data-testid="project-skills"] a',
      ".PageProjectViewSkills-skill",
      ".skills-list span",
      ".skills-list a",
      'a[href*="/search/projects?q=skills:"]',
      'a[href*="/jobs/"]',
      '[class*="Skills"] a',
      '[class*="skill"] a',
      '[class*="tag"] a',
    ],
  },
  clientCountry: [
    '[data-testid="client-country"]',
    ".PageProjectViewLoggedOut-country",
    '[class*="PageProjectView"][class*="country"]',
    '[class*="EmployerLocation"]',
    '[class*="client-country"]',
    '[class*="ClientLocation"]',
    '[class*="location"]',
    '[class*="country"]',
  ],
  projectType: [
    '[data-testid="project-type"]',
    ".PageProjectViewLoggedOut-type",
    '[class*="PageProjectView"][class*="type"]',
    '[class*="ProjectType"]',
    '[class*="project-type"]',
  ],
  bidTextarea: [
    "textarea[name='bid_description']",
    '[data-testid="bid-description"]',
    'textarea[name="description"]',
    'textarea[placeholder*="proposal" i]',
    'textarea[placeholder*="bid" i]',
    'textarea[placeholder*="cover letter" i]',
    '[role="dialog"] textarea',
    ".modal textarea",
    "textarea",
  ],
} as const;

/** Matches /projects/slug and locale-prefixed paths like /pk/projects/slug */
const PROJECT_PATH_PATTERN = /\/projects\/[^/]+/i;
const BUDGET_PATTERN =
  /(?:\$|€|£|USD|EUR|GBP|AUD|CAD|INR)\s*[\d,.]+|[\d,.]+\s*(?:USD|EUR|GBP|AUD)|(?:fixed|hourly)\s*price/i;
const PROJECT_TYPE_PATTERN = /\b(fixed(?:\s*price)?|hourly|contest|recruiter)\b/i;
const COUNTRY_LABEL_PATTERN = /^(?:country|location|client\s*location)\s*:?\s*/i;
const FREELANCER_TITLE_SUFFIX = /\s*[-|–—]\s*freelancer\.?com\s*$/i;

const NAV_NOISE = new Set([
  "freelancer",
  "hire freelancers",
  "find work",
  "post a project",
  "log in",
  "sign up",
]);

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return true;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (style.opacity === "0") return false;
  return element.getClientRects().length > 0;
}

function isUsableTitle(text: string): boolean {
  const normalized = normalizeText(text);
  if (normalized.length < 3 || normalized.length > 300) return false;
  return !NAV_NOISE.has(normalized.toLowerCase());
}

function isUsableDescription(text: string): boolean {
  return normalizeText(text).length >= 20;
}

function isUsableBudget(text: string): boolean {
  const normalized = normalizeText(text);
  if (normalized.length < 2 || normalized.length > 80) return false;
  return BUDGET_PATTERN.test(normalized) || /budget/i.test(normalized);
}

function cleanTitleFromMeta(text: string): string {
  return normalizeText(text.replace(FREELANCER_TITLE_SUFFIX, ""));
}

function firstMatchingText(
  selectors: readonly string[],
  validate: (text: string) => boolean = (text) => Boolean(normalizeText(text)),
): { text: string; source: ExtractionSource } | null {
  for (const selector of selectors) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    for (const element of elements) {
      if (!isVisible(element)) continue;
      const text = normalizeText(element.innerText);
      if (validate(text)) {
        return { text, source: "dom" };
      }
    }
  }
  return null;
}

function metaContent(selector: string): string {
  return normalizeText(document.querySelector<HTMLMetaElement>(selector)?.content ?? "");
}

function extractTitleFromMeta(): { text: string; source: ExtractionSource } | null {
  const ogTitle = metaContent('meta[property="og:title"]');
  if (ogTitle && isUsableTitle(cleanTitleFromMeta(ogTitle))) {
    return { text: cleanTitleFromMeta(ogTitle), source: "meta" };
  }

  const documentTitle = cleanTitleFromMeta(document.title);
  if (isUsableTitle(documentTitle)) {
    return { text: documentTitle, source: "meta" };
  }

  return null;
}

function extractDescriptionFromMeta(): { text: string; source: ExtractionSource } | null {
  const ogDescription = metaContent('meta[property="og:description"]');
  if (isUsableDescription(ogDescription)) {
    return { text: ogDescription, source: "meta" };
  }

  const metaDescription = metaContent('meta[name="description"]');
  if (isUsableDescription(metaDescription)) {
    return { text: metaDescription, source: "meta" };
  }

  return null;
}

function extractFromJsonLd(): Partial<
  Record<ExtractedProjectField, { text: string; source: ExtractionSource }>
> {
  const results: Partial<
    Record<ExtractedProjectField, { text: string; source: ExtractionSource }>
  > = {};

  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent ?? "") as Record<string, unknown>;
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        const type = String(record["@type"] ?? "").toLowerCase();
        if (type && !type.includes("job") && !type.includes("project")) continue;

        const title = typeof record.name === "string" ? normalizeText(record.name) : "";
        if (!results.projectTitle && isUsableTitle(title)) {
          results.projectTitle = { text: title, source: "json-ld" };
        }

        const description =
          typeof record.description === "string" ? normalizeText(record.description) : "";
        if (!results.projectDescription && isUsableDescription(description)) {
          results.projectDescription = { text: description, source: "json-ld" };
        }

        const hiringOrg = record.hiringOrganization;
        if (
          !results.clientCountry &&
          hiringOrg &&
          typeof hiringOrg === "object" &&
          "address" in hiringOrg
        ) {
          const address = (hiringOrg as { address?: { addressCountry?: string } }).address;
          const country = normalizeText(address?.addressCountry ?? "");
          if (country) {
            results.clientCountry = { text: country, source: "json-ld" };
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return results;
}

function extractSkills(): { text: string; source: ExtractionSource } | null {
  const seen = new Set<string>();
  const skills: string[] = [];

  const addSkill = (raw: string) => {
    const skill = normalizeText(raw);
    if (!skill || skill.length > 60) return;
    const key = skill.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    skills.push(skill);
  };

  for (const selector of FREELANCER_SELECTORS.skills.items) {
    const nodes = document.querySelectorAll<HTMLElement>(selector);
    if (nodes.length === 0) continue;

    for (const node of nodes) {
      if (!isVisible(node)) continue;
      addSkill(node.innerText);
    }

    if (skills.length > 0) {
      return { text: skills.join(", "), source: "dom" };
    }
  }

  for (const containerSelector of FREELANCER_SELECTORS.skills.containers) {
    const container = document.querySelector<HTMLElement>(containerSelector);
    if (!container || !isVisible(container)) continue;

    for (const link of container.querySelectorAll<HTMLElement>("a, span, li")) {
      if (!isVisible(link)) continue;
      addSkill(link.innerText);
    }

    if (skills.length > 0) {
      return { text: skills.join(", "), source: "dom" };
    }
  }

  return null;
}

function extractBudgetHeuristic(): { text: string; source: ExtractionSource } | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    '[class*="budget"], [class*="Budget"], [class*="price"], [class*="Price"], aside span, aside div',
  );

  for (const element of candidates) {
    if (!isVisible(element)) continue;
    const text = normalizeText(element.innerText);
    if (isUsableBudget(text)) {
      return { text, source: "heuristic" };
    }
  }

  return null;
}

function extractProjectTypeHeuristic(): { text: string; source: ExtractionSource } | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    '[class*="type"], [class*="Type"], [class*="budget"], aside span, aside div, main span, main div',
  );

  for (const element of candidates) {
    if (!isVisible(element)) continue;
    const text = normalizeText(element.innerText);
    const match = text.match(PROJECT_TYPE_PATTERN);
    if (match) {
      const normalized = match[1].toLowerCase();
      const label = normalized.startsWith("fixed") ? "Fixed Price" : normalized;
      return { text: label.replace(/^\w/, (char) => char.toUpperCase()), source: "heuristic" };
    }
  }

  return null;
}

function extractClientCountryHeuristic(): { text: string; source: ExtractionSource } | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    '[class*="country"], [class*="Country"], [class*="location"], [class*="Location"], aside span, aside div',
  );

  for (const element of candidates) {
    if (!isVisible(element)) continue;
    let text = normalizeText(element.innerText);
    if (text.length < 2 || text.length > 60) continue;
    text = text.replace(COUNTRY_LABEL_PATTERN, "");
    if (/^[A-Za-z][A-Za-z\s.'-]{1,40}$/.test(text) && !PROJECT_TYPE_PATTERN.test(text)) {
      return { text, source: "heuristic" };
    }
  }

  const flagAlt = document.querySelector<HTMLImageElement>('img[alt*="flag" i]');
  if (flagAlt) {
    const alt = normalizeText(flagAlt.alt.replace(/flag/gi, ""));
    if (alt.length >= 2 && alt.length <= 40) {
      return { text: alt, source: "heuristic" };
    }
  }

  return null;
}

function fieldMeta(found: boolean, source?: ExtractionSource): ExtractionFieldMeta {
  return found ? { found: true, source } : { found: false };
}

function buildMeta(
  isProjectPage: boolean,
  fieldResults: Record<ExtractedProjectField, ExtractionFieldMeta>,
): ProjectExtractionMeta {
  const fieldsFound = EXTRACTED_PROJECT_FIELDS.filter((field) => fieldResults[field].found).length;
  const fieldsTotal = EXTRACTED_PROJECT_FIELDS.length;

  return {
    isProjectPage,
    fieldsFound,
    fieldsTotal,
    partial: isProjectPage && fieldsFound > 0 && fieldsFound < fieldsTotal,
    fieldMeta: fieldResults,
  };
}

/** Returns true when the URL looks like a Freelancer.com project detail page. */
export function isFreelancerProjectPage(url: string = location.href): boolean {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("freelancer.com")) return false;
    return PROJECT_PATH_PATTERN.test(parsed.pathname);
  } catch {
    return false;
  }
}

/** Extract visible project fields from the current page with layered fallbacks. */
export function extractFreelancerProject(doc: Document = document): ProjectExtractionResult {
  const isProjectPage = isFreelancerProjectPage(doc.location?.href ?? location.href);
  const jsonLd = extractFromJsonLd();
  const project = emptyProject();
  const fieldResults = {} as Record<ExtractedProjectField, ExtractionFieldMeta>;

  const titleDom = firstMatchingText(FREELANCER_SELECTORS.title, isUsableTitle);
  const title = titleDom ?? jsonLd.projectTitle ?? extractTitleFromMeta();
  if (title) {
    project.projectTitle = title.text;
    fieldResults.projectTitle = fieldMeta(true, title.source);
  } else {
    fieldResults.projectTitle = fieldMeta(false);
  }

  const descriptionDom = firstMatchingText(FREELANCER_SELECTORS.description, isUsableDescription);
  const description = descriptionDom ?? jsonLd.projectDescription ?? extractDescriptionFromMeta();
  if (description) {
    project.projectDescription = description.text;
    fieldResults.projectDescription = fieldMeta(true, description.source);
  } else {
    fieldResults.projectDescription = fieldMeta(false);
  }

  const budgetDom = firstMatchingText(FREELANCER_SELECTORS.budget, isUsableBudget);
  const budget = budgetDom ?? extractBudgetHeuristic();
  if (budget) {
    project.budget = budget.text;
    fieldResults.budget = fieldMeta(true, budget.source);
  } else {
    fieldResults.budget = fieldMeta(false);
  }

  const skills = extractSkills();
  if (skills) {
    project.skills = skills.text;
    fieldResults.skills = fieldMeta(true, skills.source);
  } else {
    fieldResults.skills = fieldMeta(false);
  }

  const countryDom = firstMatchingText(
    FREELANCER_SELECTORS.clientCountry,
    (text) => normalizeText(text).length >= 2 && normalizeText(text).length <= 60,
  );
  const country = countryDom ?? jsonLd.clientCountry ?? extractClientCountryHeuristic();
  if (country) {
    project.clientCountry = country.text.replace(COUNTRY_LABEL_PATTERN, "");
    fieldResults.clientCountry = fieldMeta(true, country.source);
  } else {
    fieldResults.clientCountry = fieldMeta(false);
  }

  const typeDom = firstMatchingText(FREELANCER_SELECTORS.projectType, (text) =>
    PROJECT_TYPE_PATTERN.test(text),
  );
  const projectType = typeDom ?? extractProjectTypeHeuristic();
  if (projectType) {
    project.projectType = projectType.text;
    fieldResults.projectType = fieldMeta(true, projectType.source);
  } else {
    fieldResults.projectType = fieldMeta(false);
  }

  return {
    project,
    meta: buildMeta(isProjectPage, fieldResults),
  };
}

export function shouldReportProjectDetected(result: ProjectExtractionResult): boolean {
  return result.meta.isProjectPage && hasProjectContent(result.project);
}

export type InsertProposalResult = { success: true } | { success: false; error: string };

/** Locate the Freelancer bid textarea for manual insert (no auto-submit). */
export function findBidTextarea(doc: Document = document): HTMLTextAreaElement | null {
  for (const selector of FREELANCER_SELECTORS.bidTextarea) {
    const elements = doc.querySelectorAll<HTMLTextAreaElement>(selector);
    for (const element of elements) {
      if (!isVisible(element)) continue;
      if (element.disabled || element.readOnly) continue;
      return element;
    }
  }
  return null;
}

/** Set textarea value in a way React-controlled inputs recognize. */
function setNativeTextareaValue(textarea: HTMLTextAreaElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
  if (descriptor?.set) {
    descriptor.set.call(textarea, value);
  } else {
    textarea.value = value;
  }
}

/**
 * Insert proposal text into the Freelancer bid textarea only.
 * Does not click submit, place bid, or any other form action buttons.
 */
export function insertProposalIntoBidTextarea(
  proposal: string,
  doc: Document = document,
): InsertProposalResult {
  const trimmed = proposal.trim();
  if (!trimmed) {
    return { success: false, error: "No proposal text to insert." };
  }

  const textarea = findBidTextarea(doc);
  if (!textarea) {
    return {
      success: false,
      error: "Bid textarea not found on this page. Open the bid form on Freelancer first.",
    };
  }

  textarea.focus();
  setNativeTextareaValue(textarea, proposal);
  textarea.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertFromPaste",
      data: proposal,
    }),
  );
  textarea.dispatchEvent(new Event("change", { bubbles: true }));

  return { success: true };
}
