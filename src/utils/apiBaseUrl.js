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

// Async resolution: probe candidates and pick the first reachable backend
const CACHE_KEY = "scrapco_api_url";
let _resolvedCache = null;

async function probeUrl(url, timeout = 1500) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url.replace(/\/$/, "") + "/", { method: "GET", signal: controller.signal, mode: "cors" });
    clearTimeout(id);
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function resolveApiBaseUrl(preferredBaseUrl = "") {
  if (_resolvedCache) return _resolvedCache;

  const candidates = getApiBaseUrlCandidates(preferredBaseUrl);
  for (const c of candidates) {
    if (!c) continue;
    const ok = await probeUrl(c);
    if (ok) {
      try { localStorage.setItem(CACHE_KEY, c); } catch (e) {}
      _resolvedCache = c;
      return c;
    }
  }

  // fallback to synchronous result
  const fallback = getApiBaseUrl();
  try { localStorage.setItem(CACHE_KEY, fallback); } catch (e) {}
  _resolvedCache = fallback;
  return fallback;
}

export function getResolvedApiBaseUrlSync() {
  if (_resolvedCache) return _resolvedCache;
  try {
    const stored = normalizeBaseUrl(typeof window !== "undefined" ? localStorage.getItem(CACHE_KEY) : "");
    if (stored) return stored;
  } catch (e) {}
  return getApiBaseUrl();
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
