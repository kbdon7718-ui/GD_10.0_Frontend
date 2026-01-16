import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LogOut, Users, UserPlus, ScrollText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { useAuth } from "../../utils/authContext";

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center text-xs transition-all ${
        active ? "text-emerald-600 font-semibold" : "text-gray-500"
      }`}
    >
      {icon}
      <span className="text-xs mt-0.5">{label}</span>
    </button>
  );
}

export function AdminDashboard() {
  const API = getApiBaseUrl();
  const { session, logout, devAdminBypass } = useAuth();
  const token = session?.access_token;

  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [audit, setAudit] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("vendor");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editVendorId, setEditVendorId] = useState("");
  const [editGodownId, setEditGodownId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [role, setRole] = useState("vendor");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [vendorId, setVendorId] = useState(null);
  const [godownId, setGodownId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const vendorOptions = useMemo(() => vendors || [], [vendors]);

  const authHeaders = useMemo(() => {
    if (token) return { Authorization: `Bearer ${token}` };
    if (devAdminBypass) return { "x-dev-admin": "1" };
    return null;
  }, [token, devAdminBypass]);

  const loadAll = async () => {
    if (!authHeaders) return;

    setLoading(true);
    try {
      const [profilesRes, vendorsRes, auditRes] = await Promise.all([
        fetch(`${API}/api/admin/profiles?limit=300`, { headers: authHeaders }),
        fetch(`${API}/api/admin/vendors`, { headers: authHeaders }),
        fetch(`${API}/api/admin/audit?limit=100`, { headers: authHeaders }),
      ]);

      const profilesJson = await profilesRes.json();
      const vendorsJson = await vendorsRes.json();
      const auditJson = await auditRes.json();

      if (!profilesRes.ok) throw new Error(profilesJson.error || "Failed to load profiles");
      if (!vendorsRes.ok) throw new Error(vendorsJson.error || "Failed to load vendors");
      if (!auditRes.ok) throw new Error(auditJson.error || "Failed to load audit");

      setProfiles(Array.isArray(profilesJson.profiles) ? profilesJson.profiles : []);
      setVendors(Array.isArray(vendorsJson.vendors) ? vendorsJson.vendors : []);
      setAudit(Array.isArray(auditJson.audit) ? auditJson.audit : []);
    } catch (err) {
      const message = err?.message || "Failed to load admin portal";
      if (devAdminBypass && String(message).toLowerCase().includes("dev admin bypass")) {
        toast.error("Admin bypass is OFF on backend. Set ENABLE_DEV_ADMIN_BYPASS=true (dev) or login as an admin user.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // Re-run when API, token or dev-admin-bypass availability changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token, devAdminBypass]);

  useEffect(() => {
    if (role !== "vendor") setVendorId(null);
  }, [role]);

  useEffect(() => {
    if (role !== "godam") setGodownId("");
  }, [role]);

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditRole(p.role || "vendor");
    setEditEmail(p.email || "");
    setEditPhone(p.phone || "");
    setEditVendorId(p.vendor_id || "");
    setEditGodownId(p.godown_id || "");
    setEditPassword("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPassword("");
  };

  const handleSaveEdit = async () => {
    if (!authHeaders || !editingId) return;

    const payload = {
      role: editRole,
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || undefined,
      vendor_id: editRole === "vendor" ? (editVendorId || undefined) : undefined,
      godown_id: editRole === "godam" ? (editGodownId.trim() || undefined) : undefined,
      password: editPassword ? editPassword : undefined,
    };

    if (payload.password && payload.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!payload.email && !payload.phone) {
      toast.error("Provide email or phone");
      return;
    }

    if (editRole === "vendor" && !payload.vendor_id) {
      toast.error("Select vendor");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`${API}/api/admin/users/${editingId}`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update user");

      toast.success("User updated");
      setEditingId(null);
      setEditPassword("");
      await loadAll();
    } catch (err) {
      toast.error(err.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!authHeaders) return;
    const ok = window.confirm("Delete this user? This will remove login + profile.");
    if (!ok) return;

    try {
      const res = await fetch(`${API}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete user");
      toast.success("User deleted");
      if (editingId === userId) setEditingId(null);
      await loadAll();
    } catch (err) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleCreateUser = async () => {
    if (!authHeaders) return;

    const payload = {
      role,
      password,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      vendor_id: role === "vendor" ? vendorId : undefined,
      godown_id: role === "godam" ? (godownId.trim() || undefined) : undefined,
    };

    if (!payload.password || payload.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!payload.email && !payload.phone) {
      toast.error("Provide email or phone");
      return;
    }

    if (role === "vendor" && !payload.vendor_id) {
      toast.error("Select vendor");
      return;
    }

    if (role === "godam" && payload.vendor_id) {
      toast.error("Godam user cannot have vendor");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/admin/users`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create user");

      toast.success("User created");
      setEmail("");
      setPhone("");
      setPassword("");
      setVendorId(null);
      setGodownId("");

      await loadAll();
      setActiveTab("users");
    } catch (err) {
      toast.error(err.message || "Create user failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-gray-500">Loading admin panel…</div>
      </div>
    );

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col overflow-x-hidden">
      <div className="sticky top-0 z-40 bg-white px-4 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-emerald-600">
            GT<span className="text-gray-800">C</span>
          </h1>
          <p className="text-xs text-gray-600 mt-1 font-medium">Powered By ScrapCo.</p>
        </div>

        <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 p-4 app-content-safe-bottom">
        <div className="max-w-5xl mx-auto space-y-4">
          {activeTab === "users" ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Users</CardTitle>
                <Button variant="outline" size="sm" onClick={loadAll}>
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200">
                        <th className="py-2 pr-3">Role</th>
                        <th className="py-2 pr-3">Email</th>
                        <th className="py-2 pr-3">Phone</th>
                        <th className="py-2 pr-3">Godown</th>
                        <th className="py-2">Vendor</th>
                        <th className="py-2 pl-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.length === 0 ? (
                        <tr>
                          <td className="py-3 text-gray-600" colSpan={4}>
                            No users
                          </td>
                        </tr>
                      ) : (
                        profiles.map((p) => (
                          <tr key={p.id} className="border-b border-gray-100 align-top">
                            <td className="py-2 pr-3">
                              {editingId === p.id ? (
                                <Select value={editRole} onValueChange={setEditRole}>
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="vendor">Vendor</SelectItem>
                                    <SelectItem value="godam">Godam</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                String(p.role || "").toUpperCase()
                              )}
                            </td>
                            <td className="py-2 pr-3">
                              {editingId === p.id ? (
                                <Input className="h-8" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                              ) : (
                                p.email || "-"
                              )}
                            </td>
                            <td className="py-2 pr-3">
                              {editingId === p.id ? (
                                <Input className="h-8" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                              ) : (
                                p.phone || "-"
                              )}
                            </td>
                            <td className="py-2 pr-3">
                              {editingId === p.id ? (
                                <Input
                                  className="h-8"
                                  value={editGodownId}
                                  onChange={(e) => setEditGodownId(e.target.value)}
                                  placeholder="godown uuid"
                                  disabled={editRole !== "godam"}
                                />
                              ) : (
                                p.godown_id || "-"
                              )}
                            </td>
                            <td className="py-2">
                              {editingId === p.id ? (
                                <Select
                                  value={editVendorId ? String(editVendorId) : ""}
                                  onValueChange={(v) => setEditVendorId(String(v))}
                                >
                                  <SelectTrigger className="h-8" disabled={editRole !== "vendor"}>
                                    <SelectValue placeholder="Vendor" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60 overflow-y-auto">
                                    {vendorOptions.map((v) => (
                                      <SelectItem key={String(v.vendor_id)} value={String(v.vendor_id)}>
                                        {v.vendor_name} ({v.vendor_type})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                p.vendor_name ? `${p.vendor_name} (${p.vendor_type || ""})` : "-"
                              )}
                            </td>
                            <td className="py-2 pl-3 whitespace-nowrap">
                              {editingId === p.id ? (
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>
                                    {savingEdit ? "Saving..." : "Save"}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(p.id)}>
                                    Delete
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {editingId ? (
                    <div className="mt-3">
                      <div className="text-xs text-gray-600 mb-1">Reset Password (optional)</div>
                      <Input
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="minimum 8 characters"
                        type="password"
                      />
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "create" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">Role</div>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="godam">Godam</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {role === "vendor" ? (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-600">Vendor</div>
                      <Select
                        value={vendorId ? String(vendorId) : ""}
                        onValueChange={(v) => setVendorId(String(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {vendorOptions.map((v) => (
                            <SelectItem key={String(v.vendor_id)} value={String(v.vendor_id)}>
                              {v.vendor_name} ({v.vendor_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {role === "godam" ? (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-600">Godown (optional)</div>
                      <Input value={godownId} onChange={(e) => setGodownId(e.target.value)} placeholder="godown uuid" />
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">Email (optional)</div>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">Phone (optional)</div>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Password</div>
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="minimum 8 characters"
                    type="password"
                  />
                </div>

                <Button onClick={handleCreateUser} disabled={submitting} className="w-full">
                  {submitting ? "Creating..." : "Create User"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "audit" ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Audit</CardTitle>
                <Button variant="outline" size="sm" onClick={loadAll}>
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200">
                        <th className="py-2 pr-3">Time</th>
                        <th className="py-2 pr-3">Action</th>
                        <th className="py-2">Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.length === 0 ? (
                        <tr>
                          <td className="py-3 text-gray-600" colSpan={3}>
                            No audit entries
                          </td>
                        </tr>
                      ) : (
                        audit.map((a) => (
                          <tr key={a.id} className="border-b border-gray-100 align-top">
                            <td className="py-2 pr-3 whitespace-nowrap">
                              {String(a.created_at || "").replace("T", " ").slice(0, 19)}
                            </td>
                            <td className="py-2 pr-3">{a.action}</td>
                            <td className="py-2">
                              {a.target_table ? `${a.target_table}` : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="app-bottom-nav fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-md">
        <div className="h-full flex items-center justify-around px-2">
          <NavBtn
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
            icon={<Users className="h-5 w-5" />}
            label="Users"
          />
          <NavBtn
            active={activeTab === "create"}
            onClick={() => setActiveTab("create")}
            icon={<UserPlus className="h-5 w-5" />}
            label="Create"
          />
          <NavBtn
            active={activeTab === "audit"}
            onClick={() => setActiveTab("audit")}
            icon={<ScrollText className="h-5 w-5" />}
            label="Audit"
          />
        </div>
      </div>
    </div>
  );
}
