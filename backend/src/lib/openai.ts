const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

interface OutputTextContent {
  type: "output_text";
  text: string;
}

interface OutputMessage {
  type: "message";
  content?: OutputTextContent[];
}

interface OpenAIResponsesResult {
  output?: OutputMessage[];
  error?: { message?: string };
}

export class OpenAIError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

function extractOutputText(data: OpenAIResponsesResult): string {
  const parts: string[] = [];

  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text.trim()) {
        parts.push(content.text.trim());
      }
    }
  }

  return parts.join("\n\n").trim();
}

function parseTemperature(): number {
  const raw = process.env.OPENAI_TEMPERATURE ?? "0.7";
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0 || value > 2) {
    return 0.7;
  }
  return value;
}

/** Calls the OpenAI Responses API and returns generated proposal text. */
export async function generateProposal(instructions: string, input: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIError("OpenAI API key is not configured on the server", 503);
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o";
  const temperature = parseTemperature();

  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        temperature,
      }),
    });
  } catch {
    throw new OpenAIError("Unable to reach OpenAI", 502);
  }

  let data: OpenAIResponsesResult;
  try {
    data = (await response.json()) as OpenAIResponsesResult;
  } catch {
    throw new OpenAIError("Invalid response from OpenAI", 502);
  }

  if (!response.ok) {
    const message =
      data.error?.message?.trim() || `OpenAI request failed with status ${response.status}`;
    throw new OpenAIError(message, response.status >= 500 ? 502 : 400);
  }

  if (data.error?.message) {
    throw new OpenAIError(data.error.message, 502);
  }

  const proposal = extractOutputText(data);
  if (!proposal) {
    throw new OpenAIError("OpenAI returned an empty proposal", 502);
  }

  return proposal;
}
