import type { HealthResponse } from "@ezra/shared";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "GET, OPTIONS") });
}

export async function GET(request: Request) {
  const body: HealthResponse = { status: "ok" };
  return Response.json(body, { headers: corsHeaders(request, "GET, OPTIONS") });
}
