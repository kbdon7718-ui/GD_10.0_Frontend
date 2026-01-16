const LOCALHOST_API = "http://localhost:5000";
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
  const env = normalizeBaseUrl(
    (import.meta?.env?.VITE_API_URL || import.meta?.env?.REACT_APP_API_URL) ?? ""
  );
  if (env) return env;

  // Default to localhost for local development
  return LOCALHOST_API;
}

export function getApiBaseUrlCandidates(preferredBaseUrl = "") {
  const candidatesRaw = [
    normalizeBaseUrl((import.meta?.env?.VITE_API_URL || import.meta?.env?.REACT_APP_API_URL) ?? ""),
    normalizeBaseUrl(preferredBaseUrl),
    normalizeBaseUrl(getLocalCandidateBaseUrl()),
    LOCALHOST_API,
  ];
  return Array.from(new Set(candidatesRaw.filter(Boolean)));
}

export { LOCALHOST_API };
