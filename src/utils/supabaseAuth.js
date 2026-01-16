import { supabase } from "./supabaseClient";

const normalizeRole = (role) => {
  const r = String(role || "").toLowerCase();
  if (r === "admin") return "admin";
  if (r === "vendor") return "vendor";
  if (r === "manager") return "manager";
  return "owner";
};

const getProfileRole = async (userId) => {
  // Common schemas:
  // - profiles.id = auth.users.id
  // - profiles.user_id = auth.users.id
  // We try both to avoid hard coupling.
  const tryById = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (tryById?.data?.role) return normalizeRole(tryById.data.role);

  const tryByUserId = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (tryByUserId?.data?.role) return normalizeRole(tryByUserId.data.role);

  // If profile exists but role is empty, default owner.
  if (tryById?.data || tryByUserId?.data) return "owner";

  return null;
};

/**
 * Login helper per your spec:
 * - Accepts identifier (email or phone) and password
 * - Detects if identifier contains '@'
 * - Uses supabase.auth.signInWithPassword()
 * - After login, fetches user profile from 'profiles'
 * - Returns role and a redirect hint based on role
 */
export async function loginWithIdentifier(identifier, password) {
  const id = String(identifier || "").trim();
  const pass = String(password || "");

  if (!id || !pass) {
    return { ok: false, error: "Enter email/phone and password" };
  }

  const isEmail = id.includes("@");

  const { data, error } = await supabase.auth.signInWithPassword(
    isEmail
      ? { email: id, password: pass }
      : { phone: id, password: pass }
  );

  if (error) {
    return { ok: false, error: error.message || "Login failed" };
  }

  const user = data?.user;
  if (!user?.id) {
    return { ok: false, error: "Login failed" };
  }

  const role = await getProfileRole(user.id);
  if (!role) {
    return { ok: false, error: "Profile not found" };
  }

  const redirectTo = role === "admin" ? "admin" : role === "vendor" || role === "manager" ? "vendor" : "owner";
  return { ok: true, role, redirectTo, user };
}

export async function logoutSupabase() {
  await supabase.auth.signOut();
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export async function getCurrentRoleFromProfile() {
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) return null;
  return await getProfileRole(userId);
}
