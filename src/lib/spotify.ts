export function validateSpotifyUrl(url: string): {
  valid: boolean;
  error?: string;
} {
  if (!url || url.trim() === "") {
    return { valid: false, error: "Spotify URL is required" };
  }

  const trimmed = url.trim();

  // Check for spotify: URI scheme
  if (trimmed.startsWith("spotify:")) {
    const parts = trimmed.split(":");
    if (
      parts.length >= 3 &&
      ["track", "episode", "album", "playlist", "show"].includes(parts[1])
    ) {
      return { valid: true };
    }
    return { valid: false, error: "Invalid Spotify URI format" };
  }

  // Check for open.spotify.com URLs
  try {
    const parsed = new URL(trimmed);
    const validHosts = ["open.spotify.com", "spotify.com"];

    if (!validHosts.includes(parsed.hostname)) {
      return { valid: false, error: "URL must be from open.spotify.com" };
    }

    const validPaths = [
      "/track/",
      "/episode/",
      "/album/",
      "/playlist/",
      "/show/",
    ];
    const pathMatches = validPaths.some((p) => parsed.pathname.startsWith(p));

    if (!pathMatches) {
      return {
        valid: false,
        error: "URL must be a Spotify track, episode, album, or playlist link",
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Normalize a Spotify URL to a standard open.spotify.com format
 */
export function normalizeSpotifyUrl(url: string): string {
  const trimmed = url.trim();

  // Handle spotify: URI
  if (trimmed.startsWith("spotify:")) {
    const parts = trimmed.split(":");
    if (parts.length >= 3) {
      return `https://open.spotify.com/${parts[1]}/${parts[2]}`;
    }
  }

  // Handle spotify.com → open.spotify.com
  if (
    trimmed.includes("spotify.com") &&
    !trimmed.includes("open.spotify.com")
  ) {
    return trimmed.replace("spotify.com", "open.spotify.com");
  }

  return trimmed;
}
