import { createClient } from "@supabase/supabase-js";

// Public (browser-safe) Supabase config.
// Prefer env vars so deployments can change without code edits.
const FALLBACK_SUPABASE_URL = "https://vejqaypfweeggdrmwmwe.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlanFheXBmd2VlZ2dkcm13bXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODU4NjksImV4cCI6MjA3ODQ2MTg2OX0.TaX1XDA9SQUArg1i2Uqn64o9PNMEGpeFCuZDOsSKTsw";

const envUrl = import.meta?.env?.VITE_SUPABASE_URL;
const envAnon = import.meta?.env?.VITE_SUPABASE_ANON_KEY;

const SUPABASE_URL = (envUrl && String(envUrl).trim()) || FALLBACK_SUPABASE_URL;
const SUPABASE_ANON_KEY = (envAnon && String(envAnon).trim()) || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
