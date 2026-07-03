import type { ApiErrorResponse, GenerateBidRequest, GenerateBidResponse } from "@ezra/shared";
import { buildBidPrompt } from "@ezra/shared";
import { corsHeaders } from "@/lib/cors";
import { generateProposal, OpenAIError } from "@/lib/openai";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "POST, OPTIONS") });
}

function isGenerateBidRequest(body: unknown): body is GenerateBidRequest {
  if (!body || typeof body !== "object") return false;
  const fields: (keyof GenerateBidRequest)[] = [
    "projectTitle",
    "projectDescription",
    "budget",
    "skills",
    "clientCountry",
    "projectType",
    "extraInstructions",
    "proposalStyle",
    "proposalLength",
    "customPromptRules",
  ];
  return fields.every((field) => typeof (body as GenerateBidRequest)[field] === "string");
}

export async function POST(request: Request) {
  const headers = corsHeaders(request, "POST, OPTIONS");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const error: ApiErrorResponse = { error: "Invalid JSON body" };
    return Response.json(error, { status: 400, headers });
  }

  if (!isGenerateBidRequest(body)) {
    const error: ApiErrorResponse = { error: "Invalid request body" };
    return Response.json(error, { status: 400, headers });
  }

  if (!process.env.OPENAI_API_KEY) {
    const error: ApiErrorResponse = {
      error: "OpenAI API key is not configured on the server",
    };
    return Response.json(error, { status: 503, headers });
  }

  try {
    const { instructions, input } = buildBidPrompt(body);
    const proposal = await generateProposal(instructions, input);
    const response: GenerateBidResponse = { proposal };
    return Response.json(response, { headers });
  } catch (error) {
    if (error instanceof OpenAIError) {
      const apiError: ApiErrorResponse = { error: error.message };
      return Response.json(apiError, { status: error.status, headers });
    }

    console.error("generate-bid error:", error);
    const apiError: ApiErrorResponse = { error: "Failed to generate proposal" };
    return Response.json(apiError, { status: 500, headers });
  }
}
