export function normalizeImageUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    // Accept scheme-less URLs like "example.com/image.png"
    try {
      const url = new URL(`https://${trimmed.replace(/^\/+/, "")}`);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url.toString();
    } catch {
      return null;
    }
  }
}

export type JsPdfImageFormat = "PNG" | "JPEG" | "WEBP";

export function mimeToJsPdfFormat(mime: string): JsPdfImageFormat | null {
  const normalized = mime.trim().toLowerCase();

  if (normalized === "image/png") return "PNG";
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "JPEG";
  if (normalized === "image/webp") return "WEBP";

  return null;
}

