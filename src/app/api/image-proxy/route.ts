export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function isValidIPv4(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

function isBlockedIPv4(hostname: string) {
  if (!isValidIPv4(hostname)) return false;
  const [a, b] = hostname.split(".").map((n) => Number(n));

  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;

  return false;
}

function isBlockedHostname(hostname: string) {
  const lower = hostname.toLowerCase().trim();
  if (!lower) return true;

  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (lower === "0.0.0.0") return true;
  if (lower.endsWith(".local")) return true;

  if (isBlockedIPv4(lower)) return true;

  if (lower.includes(":")) {
    // Avoid IPv6 SSRF edge cases (link-local/ULA/etc).
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url");

  if (!urlParam) {
    return new Response("Missing url", { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(urlParam);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return new Response("Invalid protocol", { status: 400 });
  }

  if (isBlockedHostname(targetUrl.hostname)) {
    return new Response("Blocked host", { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl.toString(), { redirect: "follow" });
  } catch {
    return new Response("Failed to fetch", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("Upstream error", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return new Response("Unsupported content-type", { status: 415 });
  }

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    const bytes = Number(contentLength);
    if (Number.isFinite(bytes) && bytes > MAX_IMAGE_BYTES) {
      return new Response("Image too large", { status: 413 });
    }
  }

  const arrayBuffer = await upstream.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    return new Response("Image too large", { status: 413 });
  }

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

