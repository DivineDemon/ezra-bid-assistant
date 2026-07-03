function parseAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string): boolean {
  if (origin.startsWith("chrome-extension://")) return true;
  if (origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000") {
    return true;
  }
  return parseAllowedOrigins().includes(origin);
}

/** Reflects a safe Origin for extension and local dev requests. */
export function corsHeaders(request: Request, methods: string): HeadersInit {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }

  return headers;
}
