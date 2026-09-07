// Shared helpers for API-provided image URLs.
import type { SyntheticEvent } from "react";

// Default banner photo (same image the restaurant cards fall back to).
export const FALLBACK_BANNER =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85";

/**
 * Uploads made while the API ran behind Render's TLS proxy (before `trust
 * proxy` was enabled) were stored with http:// URLs. Browsers treat those as
 * mixed content on the HTTPS site (blocked/upgraded, flagged by PageSpeed),
 * so normalize every API-provided image URL to https://.
 */
export function secureImageUrl(url?: string | null): string {
  if (!url) return "";
  return url.replace(/^http:\/\//i, "https://");
}

/**
 * onError handler for <img> — swap a dead image (e.g. an /uploads file that no
 * longer exists on the API host after a redeploy) to the default banner, once.
 */
export function bannerImageFallback(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = "1";
  img.src = FALLBACK_BANNER;
}