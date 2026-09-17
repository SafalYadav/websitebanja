"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  Crown,
  History,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminUserDirectoryItem } from "@/lib/db/queries";

interface AdminUsersAccessProps {
  sessionToken?: string;
  currentAdminEmail?: string | null;
}

interface PrivilegeAuditItem {
  id: string;
  actor_admin_id?: string;
  action: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export default function AdminUsersAccess({ sessionToken, currentAdminEmail }: AdminUsersAccessProps) {
  const [users, setUsers] = useState<AdminUserDirectoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<PrivilegeAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Confirmation modal state
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    user: AdminUserDirectoryItem | null;
    actionType: "grant_admin" | "revoke_admin" | "grant_pro" | "revoke_pro";
    reason: string;
    isSubmitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    user: null,
    actionType: "grant_admin",
    reason: "",
    isSubmitting: false,
    error: null,
  });

  const fetchData = useCallback(
    async (manual = false) => {
      if (manual) setIsRefreshing(true);
      else setIsLoading(true);
      setErrorMessage(null);

      try {
        const headers: Record<string, string> = {};
        if (sessionToken) {
          headers["Authorization"] = `Bearer ${sessionToken}`;
        }

        // 1. Fetch Users Directory
        const resUsers = await fetch(`/api/admin/users?t=${Date.now()}`, {
          cache: "no-store",
          headers,
        });

        if (resUsers.status === 401 || resUsers.status === 403) {
          setErrorMessage("Unauthorized: Administrator clearance required.");
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }

        const jsonUsers = await resUsers.json();
        if (jsonUsers.success && Array.isArray(jsonUsers.data)) {
          setUsers(jsonUsers.data);
        }

        // 2. Fetch Recent Audit Logs
        const resAudit = await fetch(`/api/admin/audit-logs?limit=25&t=${Date.now()}`, {
          cache: "no-store",
          headers,
        });
        const jsonAudit = await resAudit.json();
        if (jsonAudit.success && Array.isArray(jsonAudit.data)) {
          setAuditLogs(jsonAudit.data);
        }
      } catch (err) {
        console.error("[AdminUsersAccess Error]:", err);
        setErrorMessage("Failed to load user access directory.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [sessionToken]
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Execute Privilege Change
  const handleExecuteAction = async () => {
    if (!actionModal.user) return;
    const { user, actionType, reason } = actionModal;

    setActionModal((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) {
        headers["Authorization"] = `Bearer ${sessionToken}`;
      }

      let endpoint = "";
      let action = "";

      if (actionType === "grant_admin" || actionType === "revoke_admin") {
        endpoint = `/api/admin/users/${user.userId}/admin`;
        action = actionType === "grant_admin" ? "grant" : "revoke";
      } else {
        endpoint = `/api/admin/users/${user.userId}/pro`;
        action = actionType === "grant_pro" ? "grant" : "revoke";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action,
          reason: reason || undefined,
          targetEmail: user.email || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update privilege.");
      }

      // Close modal and refresh authoritative server state
      setActionModal({
        isOpen: false,
        user: null,
        actionType: "grant_admin",
        reason: "",
        isSubmitting: false,
        error: null,
      });

      await fetchData(true);
    } catch (err) {
      setActionModal((prev) => ({
        ...prev,
        isSubmitting: false,
        error: err instanceof Error ? err.message : "Privilege modification failed.",
      }));
    }
  };

  // Filter users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.userId.toLowerCase().includes(q);

      const matchesPlan =
        planFilter === "all" ||
        (planFilter === "pro" && u.isPro) ||
        (planFilter === "free" && !u.isPro);

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && u.isAdmin) ||
        (roleFilter === "user" && !u.isAdmin);

      return matchesSearch && matchesPlan && matchesRole;
    });
  }, [users, searchQuery, planFilter, roleFilter]);

  if (isLoading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
        </div>
        <div className="h-96 w-full bg-zinc-100 dark:bg-zinc-900/60 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (errorMessage && users.length === 0) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Users Directory Unavailable</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">{errorMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchData(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-violet-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Users & Access Control</span>
                <span className="rounded-md bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  SECURITY
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Server-enforced user identity, administrative roles, and Pro entitlement management
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition shadow-xs"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-blue-600")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, email, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-4 py-2 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="all">All Plans</option>
              <option value="pro">Pro Only</option>
              <option value="free">Free Only</option>
            </select>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins Only</option>
            <option value="user">Regular Users</option>
          </select>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="rounded-3xl border border-zinc-200 bg-white shadow-xs overflow-hidden dark:border-white/10 dark:bg-zinc-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/40 text-zinc-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="p-4">User Identity</th>
                <th className="p-4">Admin Status</th>
                <th className="p-4">Plan / Entitlement</th>
                <th className="p-4">Websites</th>
                <th className="p-4">Registered</th>
                <th className="p-4 text-right">Access Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500 text-xs">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const displayName = u.name || (u.email ? u.email.split("@")[0] : `User ${u.userId.slice(0, 8)}`);
                  return (
                    <tr key={u.userId} className="hover:bg-zinc-50/60 dark:hover:bg-white/5 transition">
                      {/* Real User Identity */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <span>{displayName}</span>
                            {u.isAdmin && (
                              <span title="Verified Administrator">
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500">{u.email || "No email linked"}</div>
                          <div className="font-mono text-[10px] text-zinc-400">
                            ID: {u.userId.slice(0, 8)}...{u.userId.slice(-4)}
                          </div>
                        </div>
                      </td>

                      {/* Admin Status */}
                      <td className="p-4">
                        {u.isAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-[10px] font-bold">
                            <Shield className="h-3 w-3" />
                            <span>ADMIN</span>
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[10px] font-semibold">USER</span>
                        )}
                      </td>

                      {/* Plan / Entitlement */}
                      <td className="p-4">
                        {u.isPro ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800 px-2.5 py-0.5 text-[10px] font-bold">
                            <Crown className="h-3 w-3" />
                            <span>PAID PRO</span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-0.5 text-[10px] font-bold">
                            FREE
                          </span>
                        )}
                      </td>

                      {/* Websites Count */}
                      <td className="p-4 font-semibold text-zinc-700 dark:text-zinc-300">
                        {u.projectsCount} total ({u.publishedCount} live)
                      </td>

                      {/* Registered Date */}
                      <td className="p-4 font-mono text-zinc-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Admin Action */}
                          {u.isAdmin ? (
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  isOpen: true,
                                  user: u,
                                  actionType: "revoke_admin",
                                  reason: "",
                                  isSubmitting: false,
                                  error: null,
                                })
                              }
                              className="rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 px-2.5 py-1 text-[10px] font-bold transition shadow-xs"
                            >
                              Revoke Admin
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  isOpen: true,
                                  user: u,
                                  actionType: "grant_admin",
                                  reason: "",
                                  isSubmitting: false,
                                  error: null,
                                })
                              }
                              className="rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-1 text-[10px] font-bold transition shadow-xs"
                            >
                              Grant Admin
                            </button>
                          )}

                          {/* Pro Action */}
                          {u.isPro ? (
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  isOpen: true,
                                  user: u,
                                  actionType: "revoke_pro",
                                  reason: "",
                                  isSubmitting: false,
                                  error: null,
                                })
                              }
                              className="rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 px-2.5 py-1 text-[10px] font-bold transition shadow-xs"
                            >
                              Revoke Pro
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  isOpen: true,
                                  user: u,
                                  actionType: "grant_pro",
                                  reason: "",
                                  isSubmitting: false,
                                  error: null,
                                })
                              }
                              className="rounded-lg border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300 px-2.5 py-1 text-[10px] font-bold transition shadow-xs"
                            >
                              Grant Pro
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Privilege Audit Trail Stream */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <History className="h-4 w-4 text-blue-500" />
          <span>Privilege Change Audit Stream</span>
        </h3>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-zinc-900/60 divide-y divide-zinc-100 dark:divide-white/5 text-xs">
          {auditLogs.length === 0 ? (
            <p className="text-zinc-500 py-3 text-center">No privilege change audit events recorded yet.</p>
          ) : (
            auditLogs.map((log) => {
              const meta = log.metadata || {};
              const targetId = (meta.targetUserId as string) || "user";
              return (
                <div key={log.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        log.action.includes("REVOKED") ? "bg-red-500" : "bg-emerald-500"
                      )}
                    />
                    <div>
                      <span className="font-mono font-bold uppercase text-[11px] text-zinc-800 dark:text-zinc-200">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-zinc-500 ml-2">
                        Target: <span className="font-mono">{targetId.slice(0, 8)}...</span>
                      </span>
                      {Boolean(meta.reason) && (
                        <span className="text-[11px] text-zinc-400 italic ml-2">
                          — &quot;{String(meta.reason)}&quot;
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {new Date(log.created_at).toLocaleTimeString()} • {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      <AnimatePresence>
        {actionModal.isOpen && actionModal.user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900 space-y-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl text-white",
                      actionModal.actionType.includes("revoke") ? "bg-red-600" : "bg-blue-600"
                    )}
                  >
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white capitalize">
                      Confirm {actionModal.actionType.replace("_", " ")}
                    </h3>
                    <p className="text-xs text-zinc-400">Authoritative server-side privilege update</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                  className="rounded-xl border border-zinc-200 p-2 text-zinc-400 hover:text-zinc-600 dark:border-white/10 dark:hover:text-white"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-4 border border-zinc-100 dark:border-white/5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Target User:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {actionModal.user.name || actionModal.user.email || actionModal.user.userId}
                  </span>
                </div>
                {actionModal.user.email && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Email:</span>
                    <span className="text-zinc-700 dark:text-zinc-300 font-mono">{actionModal.user.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">Operation:</span>
                  <span className="font-bold text-blue-600 uppercase font-mono">
                    {actionModal.actionType.toUpperCase()}
                  </span>
                </div>
              </div>

              {actionModal.error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-600 dark:text-red-400">
                  {actionModal.error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Audit Reason (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Administrative grant, support escalation..."
                  value={actionModal.reason}
                  onChange={(e) => setActionModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleExecuteAction()}
                  disabled={actionModal.isSubmitting}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition",
                    actionModal.actionType.includes("revoke")
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {actionModal.isSubmitting ? "Committing..." : "Confirm & Execute"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
