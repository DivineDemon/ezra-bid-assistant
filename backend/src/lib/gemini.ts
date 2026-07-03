const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiContentPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiContentPart[];
  };
}

interface GeminiGenerateResult {
  candidates?: GeminiCandidate[];
  error?: { message?: string };
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

function extractOutputText(data: GeminiGenerateResult): string {
  const parts: string[] = [];

  for (const candidate of data.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.text?.trim()) {
        parts.push(part.text.trim());
      }
    }
  }

  return parts.join("\n\n").trim();
}

function parseTemperature(): number {
  const raw = process.env.GEMINI_TEMPERATURE ?? "0.7";
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0 || value > 2) {
    return 0.7;
  }
  return value;
}

/** Calls the Gemini generateContent API and returns generated proposal text. */
export async function generateProposal(instructions: string, input: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("Gemini API key is not configured on the server", 503);
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
  const temperature = parseTemperature();
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: instructions }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input }],
          },
        ],
        generationConfig: {
          temperature,
        },
      }),
    });
  } catch {
    throw new GeminiError("Unable to reach Gemini", 502);
  }

  let data: GeminiGenerateResult;
  try {
    data = (await response.json()) as GeminiGenerateResult;
  } catch {
    throw new GeminiError("Invalid response from Gemini", 502);
  }

  if (!response.ok) {
    const message =
      data.error?.message?.trim() || `Gemini request failed with status ${response.status}`;
    throw new GeminiError(message, response.status >= 500 ? 502 : 400);
  }

  if (data.error?.message) {
    throw new GeminiError(data.error.message, 502);
  }

  const proposal = extractOutputText(data);
  if (!proposal) {
    throw new GeminiError("Gemini returned an empty proposal", 502);
  }

  return proposal;
}
