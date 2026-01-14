import { createClient } from "@supabase/supabase-js";

// NOTE: These values were previously stored in `supabaseClient.ts`.
// This project is JS (no TypeScript dependency), so keep the runtime client in JS.
const SUPABASE_URL = "https://vejqaypfweeggdrmwmwe.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlanFheXBmd2VlZ2dkcm13bXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODU4NjksImV4cCI6MjA3ODQ2MTg2OX0.TaX1XDA9SQUArg1i2Uqn64o9PNMEGpeFCuZDOsSKTsw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
