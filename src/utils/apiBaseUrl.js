// Default backend API base. This project is configured to use Render.
const LOCALHOST_API = "https://gd-10-0-backend-1.onrender.com";
const STORAGE_KEY_API_BASE = "scrapco_api_base_url";

export function getStoredApiBaseUrl() {
  if (typeof window === "undefined") return "";
  try {
    return normalizeBaseUrl(window.localStorage.getItem(STORAGE_KEY_API_BASE) || "");
  } catch (_e) {
    return "";
  }
}

export function setStoredApiBaseUrl(baseUrl) {
  if (typeof window === "undefined") return;
  const normalized = normalizeBaseUrl(baseUrl);
  try {
    if (normalized) window.localStorage.setItem(STORAGE_KEY_API_BASE, normalized);
    else window.localStorage.removeItem(STORAGE_KEY_API_BASE);
  } catch (_e) {
    // ignore storage failures
  }
}
export function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return "";
  return String(baseUrl).trim().replace(/\/+$/, "");
}

export function getLocalCandidateBaseUrl() {
  if (typeof window === "undefined") return "";

  const host = window.location.hostname;
  const proto = window.location.protocol;
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!isLoopback) return "";
  if (proto === "https:") return "";

  return `http://${host}:5000`;
}

export function getApiBaseUrl() {
  const stored = getStoredApiBaseUrl();
  if (stored) return stored;

  const env = normalizeBaseUrl(
    (
      import.meta?.env?.VITE_API_URL ||
      import.meta?.env?.REACT_APP_API_URL ||
      import.meta?.env?.REACT_APP_API_BASE_URL
    ) ?? ""
  );
  if (env) return env;

  // If a default base URL is configured, prefer it even on localhost.
  // This avoids vendor/admin pages accidentally trying http://localhost:5000.
  const configuredDefault = normalizeBaseUrl(LOCALHOST_API);
  if (configuredDefault) return configuredDefault;

  // For local dev without env vars
  const localCandidate = normalizeBaseUrl(getLocalCandidateBaseUrl());
  if (localCandidate) return localCandidate;

  // For production hosting, prefer same-origin (requires a reverse proxy) rather than hardcoding localhost.
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(
      "API base URL not configured. Set VITE_API_URL (or REACT_APP_API_URL) to your backend URL. Falling back to same-origin requests."
    );
  }

  return "";
}

export function getApiBaseUrlCandidates(preferredBaseUrl = "") {
  const candidatesRaw = [
    getStoredApiBaseUrl(),
    normalizeBaseUrl(
      (
        import.meta?.env?.VITE_API_URL ||
        import.meta?.env?.REACT_APP_API_URL ||
        import.meta?.env?.REACT_APP_API_BASE_URL
      ) ?? ""
    ),
    normalizeBaseUrl(preferredBaseUrl),
    normalizeBaseUrl(LOCALHOST_API),
    normalizeBaseUrl(getLocalCandidateBaseUrl()),
    "",
    LOCALHOST_API,
  ];
  return Array.from(new Set(candidatesRaw.filter(Boolean)));
}

export { LOCALHOST_API, STORAGE_KEY_API_BASE };
