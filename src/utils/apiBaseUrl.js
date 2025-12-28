const ONRENDER_API = "https://gd-10-0-backend-1.onrender.com";
const ONRENDER_API_ALT = "https://gd-10-0-backend.onrender.com";
const LOCALHOST_API = "http://localhost:5000";
export function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return "";
  return String(baseUrl).trim().replace(/\/+$/, "");
}

export function getLocalCandidateBaseUrl() {
  if (typeof window === "undefined") return "";

  const host = window.location.hostname;
  const proto = window.location.protocol;
  const isIpV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const isLocalish = isLoopback || isIpV4;

  if (!isLocalish) return "";
  if (proto === "https:") return "";

  return `http://${host}:5000`;
}

export function getApiBaseUrl() {
  const env = normalizeBaseUrl(process.env.REACT_APP_API_URL);
  if (env) return env;

  if (typeof window !== "undefined") {
    const stored = normalizeBaseUrl(localStorage.getItem("scrapco_api_url"));
    if (stored) return stored;

    const localCandidate = normalizeBaseUrl(getLocalCandidateBaseUrl());
    if (localCandidate) return localCandidate;
  }

  // Default to localhost for development, Render for production
  if (window?.location?.hostname === "localhost" || window?.location?.hostname === "127.0.0.1") {
    return LOCALHOST_API;
  }
  return ONRENDER_API;
}

export function getApiBaseUrlCandidates(preferredBaseUrl = "") {
  const candidatesRaw = [
    normalizeBaseUrl(process.env.REACT_APP_API_URL),
    normalizeBaseUrl(typeof window !== "undefined" ? localStorage.getItem("scrapco_api_url") : ""),
    normalizeBaseUrl(preferredBaseUrl),
    normalizeBaseUrl(getLocalCandidateBaseUrl()),
    LOCALHOST_API,
    ONRENDER_API,
    ONRENDER_API_ALT,
  ];
  return Array.from(new Set(candidatesRaw.filter(Boolean)));
}

export { ONRENDER_API, ONRENDER_API_ALT, LOCALHOST_API };
