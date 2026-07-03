import type { GenerateBidRequest, GenerateBidResponse, HealthResponse } from "@ezra/shared";

export async function checkHealth(baseUrl: string): Promise<HealthResponse> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health`);
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`);
  }
  return response.json() as Promise<HealthResponse>;
}

export async function generateBid(
  baseUrl: string,
  body: GenerateBidRequest,
): Promise<GenerateBidResponse> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate-bid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data as GenerateBidResponse;
}
