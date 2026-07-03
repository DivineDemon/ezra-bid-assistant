/** Project details extracted from the Freelancer.com DOM */
export interface ExtractedProject {
  projectTitle: string;
  projectDescription: string;
  budget: string;
  skills: string;
  clientCountry: string;
  projectType: string;
}

export const EXTRACTED_PROJECT_FIELDS = [
  "projectTitle",
  "projectDescription",
  "budget",
  "skills",
  "clientCountry",
  "projectType",
] as const satisfies readonly (keyof ExtractedProject)[];

export type ExtractedProjectField = (typeof EXTRACTED_PROJECT_FIELDS)[number];

/** How a single field was resolved during extraction */
export type ExtractionSource = "dom" | "meta" | "json-ld" | "heuristic";

export interface ExtractionFieldMeta {
  found: boolean;
  source?: ExtractionSource;
}

/** Metadata about extraction quality — drives manual-entry fallback UI */
export interface ProjectExtractionMeta {
  isProjectPage: boolean;
  fieldsFound: number;
  fieldsTotal: number;
  /** True when on a project page but one or more fields are missing */
  partial: boolean;
  fieldMeta: Record<ExtractedProjectField, ExtractionFieldMeta>;
}

export interface ProjectExtractionResult {
  project: ExtractedProject;
  meta: ProjectExtractionMeta;
}

export function emptyProject(): ExtractedProject {
  return {
    projectTitle: "",
    projectDescription: "",
    budget: "",
    skills: "",
    clientCountry: "",
    projectType: "",
  };
}

export function hasProjectContent(project: ExtractedProject): boolean {
  return Boolean(project.projectTitle.trim() || project.projectDescription.trim());
}

export function countFoundFields(meta: ProjectExtractionMeta): number {
  return meta.fieldsFound;
}

export function extractionStatusLabel(meta: ProjectExtractionMeta): string {
  if (!meta.isProjectPage) {
    return "No project detected";
  }
  if (meta.fieldsFound === 0) {
    return "Project page detected — enter details manually";
  }
  if (meta.partial) {
    return `Project detected (${meta.fieldsFound}/${meta.fieldsTotal} fields) — review or fill missing fields`;
  }
  return "Project detected";
}
