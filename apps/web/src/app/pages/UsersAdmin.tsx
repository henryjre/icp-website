import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "../components/Modal";
import { toast } from "../components/Toast";
import { motion, AnimatePresence } from "motion/react";
import type { InviteCodeDTO, Role, UserManagementDTO, UserStatus } from "@icp/shared";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";
import {
  staggerContainerVariants,
  staggerChildVariants,
  heroContainerVariants,
  heroItemVariants,
  transitionFast,
  EASE_STRUCTURAL,
} from "../lib/animations";

const userStatuses: Array<UserStatus | "All"> = ["All", "Pending", "Active", "Rejected", "Archived"];
const inviteStatuses: Array<"All" | "Active" | "Archived" | "Expired"> = ["All", "Active", "Archived", "Expired"];
const roles: Role[] = ["admin", "editor", "client"];
const DRAFT_KEY = "form:users-admin";

function userStatusBadge(status: UserStatus) {
  if (status === "Active") return "bg-green-100 text-green-700 border border-green-200";
  if (status === "Pending") return "bg-blue-100 text-blue-700 border border-blue-200";
  if (status === "Rejected") return "bg-red-100 text-red-700 border border-red-200";
  return "bg-gray-100 text-gray-500 border border-gray-200";
}

function inviteStatusBadge(status: string) {
  if (status === "Active") return "bg-green-100 text-green-700 border border-green-200";
  if (status === "Expired") return "bg-orange-100 text-orange-700 border border-orange-200";
  return "bg-gray-100 text-gray-500 border border-gray-200";
}

function roleBadge(role: Role | null) {
  if (role === "admin") return "bg-brand-soft text-brand-primary border border-brand-surface-mid";
  if (role === "editor") return "bg-cyan-50 text-cyan-700 border border-cyan-200";
  return "bg-gray-100 text-gray-600 border border-gray-200";
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "bg-brand-primary text-white",
    "bg-brand-secondary text-white",
    "bg-brand-accent text-brand-primary",
    "bg-purple-600 text-white",
    "bg-orange-500 text-white",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function UsersAdmin() {
  const [mainTab, setMainTab] = useState<"users" | "invites">(() => getDraft(`${DRAFT_KEY}:mainTab`, "users"));

  const [users, setUsers] = useState<UserManagementDTO[]>([]);
  const [userStatus, setUserStatus] = useState<UserStatus | "All">(() => getDraft(`${DRAFT_KEY}:userStatus`, "All"));
  const [userSearch, setUserSearch] = useState(() => getDraft(`${DRAFT_KEY}:userSearch`, ""));
  const [usersLoading, setUsersLoading] = useState(false);

  const [invites, setInvites] = useState<InviteCodeDTO[]>([]);
  const [inviteStatus, setInviteStatus] = useState<"All" | "Active" | "Archived" | "Expired">(() => getDraft(`${DRAFT_KEY}:inviteStatus`, "All"));
  const [invitesLoading, setInvitesLoading] = useState(false);

  const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, Role>>({});

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createInviteOpen, setCreateInviteOpen] = useState(false);

  // Confirmation modals
  const [rejectUserTarget, setRejectUserTarget] = useState<UserManagementDTO | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [archiveUserTarget, setArchiveUserTarget] = useState<UserManagementDTO | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserManagementDTO | null>(null);
  const [archiveInviteTarget, setArchiveInviteTarget] = useState<InviteCodeDTO | null>(null);
  const [deleteInviteTarget, setDeleteInviteTarget] = useState<InviteCodeDTO | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ user: UserManagementDTO; role: Role } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [createUserForm, setCreateUserForm] = useState(() =>
    getDraft(`${DRAFT_KEY}:createUser`, {
      fullName: "",
      email: "",
      password: "",
      role: "client" as Role,
    }),
  );

  const [createInviteForm, setCreateInviteForm] = useState(() =>
    getDraft(`${DRAFT_KEY}:createInvite`, {
      label: "",
      expiry: "7d",
    }),
  );

  const resolvedUsers = useMemo(
    () => users.filter((user) => {
      if (!userSearch.trim()) return true;
      const needle = userSearch.toLowerCase();
      return user.fullName.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
    }),
    [users, userSearch],
  );

  const pendingCount = useMemo(() => users.filter((u) => u.status === "Pending").length, [users]);
  const activeCount = useMemo(() => users.filter((u) => u.status === "Active").length, [users]);
  const activeInvites = useMemo(() => invites.filter((i) => i.status === "Active").length, [invites]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await apiClient.listUsers(userStatus, userSearch);
      setUsers(data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadInvites = async () => {
    setInvitesLoading(true);
    try {
      const data = await apiClient.listInvites(inviteStatus);
      setInvites(data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load invites");
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => { void loadUsers(); }, [userStatus]);
  useEffect(() => { void loadInvites(); }, [inviteStatus]);

  const patchUser = (updated: UserManagementDTO) =>
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

  const patchInvite = (updated: InviteCodeDTO) =>
    setInvites((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));

  const withError = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action failed");
    }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    await withError(async () => {
      const { user } = await apiClient.createUser(createUserForm);
      setUsers((prev) => [user, ...prev]);
      setCreateUserForm({ fullName: "", email: "", password: "", role: "client" });
      clearDraft(`${DRAFT_KEY}:createUser`);
      setCreateUserOpen(false);
      toast.success("User created successfully");
    });
  };

  const approveUser = async (userId: string) => {
    const pendingUser = users.find((user) => user.id === userId);
    const role = selectedRoleByUser[userId] ?? pendingUser?.role ?? "client";
    await withError(async () => {
      const { user } = await apiClient.approveUser(userId, { role });
      patchUser(user);
      toast.success("User approved");
    });
  };

  const rejectUser = async () => {
    if (!rejectUserTarget) return;
    setModalLoading(true);
    try {
      await withError(async () => {
        const { user } = await apiClient.rejectUser(rejectUserTarget.id, {
          reason: rejectionReason.trim() || undefined,
        });
        patchUser(user);
        toast.success("User rejected");
      });
    } finally {
      setModalLoading(false);
      setRejectUserTarget(null);
      setRejectionReason("");
    }
  };

  const archiveUser = async (userId: string) => {
    setModalLoading(true);
    try {
      await withError(async () => {
        const { user } = await apiClient.archiveUser(userId);
        patchUser(user);
        toast.success("User archived");
      });
    } finally {
      setModalLoading(false);
      setArchiveUserTarget(null);
    }
  };

  const unarchiveUser = async (userId: string) => {
    await withError(async () => {
      const { user } = await apiClient.unarchiveUser(userId);
      patchUser(user);
      toast.success("User restored to Active");
    });
  };

  const deleteUser = async (userId: string) => {
    setModalLoading(true);
    try {
      await withError(async () => {
        await apiClient.deleteUser(userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        toast.success("User deleted");
      });
    } finally {
      setModalLoading(false);
      setDeleteUserTarget(null);
    }
  };

  const updateRole = async (userId: string, role: Role) => {
    await withError(async () => {
      const { user } = await apiClient.updateUserRole(userId, role);
      patchUser(user);
      toast.success("Role updated");
    });
  };

  const createInvite = async (event: FormEvent) => {
    event.preventDefault();
    await withError(async () => {
      const now = new Date();
      let expiresAt: string | null = null;
      if (createInviteForm.expiry === "24h") expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      else if (createInviteForm.expiry === "7d") expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      else if (createInviteForm.expiry === "30d") expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const payload = await apiClient.createInvite({ label: createInviteForm.label.trim() || undefined, expiresAt });
      await navigator.clipboard.writeText(payload.inviteLink);
      setInvites((prev) => [payload.invite, ...prev]);
      setCreateInviteForm({ label: "", expiry: "7d" });
      clearDraft(`${DRAFT_KEY}:createInvite`);
      setCreateInviteOpen(false);
      toast.success("Invite created — link copied to clipboard.");
    });
  };

  const sendInvite = async (inviteId: string) => {
    const toEmail = window.prompt("Send invite to email:");
    if (!toEmail) return;
    await withError(async () => {
      await apiClient.sendInviteEmail(inviteId, { toEmail: toEmail.trim() });
      toast.success("Invite email sent");
    });
  };

  const copyInvite = async (code: string) => {
    const origin = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ?? window.location.origin;
    const link = `${origin.replace(/\/+$/, "")}/register?code=${encodeURIComponent(code)}`;
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard");
  };

  const deleteInvite = async (invite: InviteCodeDTO) => {
    setModalLoading(true);
    try {
      await withError(async () => {
        await apiClient.deleteInvite(invite.id);
        setInvites((prev) => prev.filter((i) => i.id !== invite.id));
        toast.success("Invite deleted");
      });
    } finally {
      setModalLoading(false);
      setDeleteInviteTarget(null);
    }
  };

  const toggleInviteArchive = async (invite: InviteCodeDTO) => {
    if (invite.status === "Archived") {
      await withError(async () => {
        const { invite: updated } = await apiClient.unarchiveInvite(invite.id);
        patchInvite(updated);
        toast.success("Invite unarchived");
      });
      return;
    }
    setArchiveInviteTarget(invite);
  };

  const confirmArchiveInvite = async () => {
    if (!archiveInviteTarget) return;
    setModalLoading(true);
    try {
      await withError(async () => {
        const { invite: updated } = await apiClient.archiveInvite(archiveInviteTarget.id);
        patchInvite(updated);
        toast.success("Invite archived");
      });
    } finally {
      setModalLoading(false);
      setArchiveInviteTarget(null);
    }
  };

  const btnBase = "inline-flex min-h-9 sm:min-h-0 items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap";
  const btnPrimary = `${btnBase} bg-brand-primary text-white hover:bg-brand-primary-hover`;
  const btnGreen = `${btnBase} bg-brand-accent text-brand-primary hover:bg-brand-accent-strong`;
  const btnCyan = `${btnBase} bg-brand-secondary text-white hover:opacity-90`;
  const btnGray = `${btnBase} bg-gray-500 text-white hover:bg-gray-600`;
  const btnOrange = `${btnBase} bg-orange-500 text-white hover:bg-orange-600`;
  const btnRed = `${btnBase} bg-red-600 text-white hover:bg-red-700`;

  return (
    <div className="min-h-screen bg-[#f5f7fc]">
      {/* ── Hero ── */}
      <section className="bg-brand-primary">
        <motion.div
          className="max-w-[80rem] mx-auto px-4 sm:px-6 py-10 sm:py-14"
          variants={heroContainerVariants}
          initial="hidden"
          animate="animate"
        >
          <motion.span variants={heroItemVariants} className="text-brand-accent text-xs tracking-[0.2em] uppercase font-semibold">
            Administration
          </motion.span>
          <motion.h1 variants={heroItemVariants} className="text-white mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
            User Management
          </motion.h1>
          <motion.p variants={heroItemVariants} className="text-blue-200 mt-2 text-sm max-w-xl">
            Manage account approvals, lifecycle status, roles, and invite codes.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Stats strip ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
            {[
              { label: "Total Users", value: users.length, color: "text-brand-primary" },
              { label: "Pending Approval", value: pendingCount, color: "text-blue-600" },
              { label: "Active Users", value: activeCount, color: "text-green-600" },
              { label: "Active Invites", value: activeInvites, color: "text-brand-secondary" },
            ].map((stat) => (
              <div key={stat.label} className="flex min-w-0 flex-col gap-0.5">
                <span className={`text-xl sm:text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</span>
                <span className="text-[11px] sm:text-xs text-gray-500 font-medium leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[80rem] mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">

        {/* ── Tab bar ── */}
        <div className="flex gap-0 border-b border-gray-200">
          {(["users", "invites"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setMainTab(tab); setDraft(`${DRAFT_KEY}:mainTab`, tab); }}
              className={`relative flex-1 sm:flex-none px-5 py-3 text-sm font-semibold transition-colors duration-150 cursor-pointer capitalize ${
                mainTab === tab
                  ? "text-brand-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
              {mainTab === tab && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full"
                  transition={{ duration: 0.2, ease: EASE_STRUCTURAL }}
                />
              )}
              {tab === "users" && pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* USERS TAB */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {mainTab === "users" && (
          <motion.div
            key="users-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitionFast}
            className="space-y-5"
          >
            {/* Create user panel */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setCreateUserOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  <span className="text-sm font-semibold text-brand-primary">Create Active User</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${createUserOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </button>
              <AnimatePresence initial={false}>
                {createUserOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: EASE_STRUCTURAL }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">
                      <form onSubmit={createUser} className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                        <input
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#f5f7fc] focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
                          placeholder="Full name"
                          value={createUserForm.fullName}
                          onChange={(e) => { const n = { ...createUserForm, fullName: e.target.value }; setCreateUserForm(n); setDraft(`${DRAFT_KEY}:createUser`, n); }}
                          required
                        />
                        <input
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#f5f7fc] focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
                          placeholder="Email address"
                          type="email"
                          value={createUserForm.email}
                          onChange={(e) => { const n = { ...createUserForm, email: e.target.value }; setCreateUserForm(n); setDraft(`${DRAFT_KEY}:createUser`, n); }}
                          required
                        />
                        <input
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#f5f7fc] focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
                          placeholder="Password"
                          type="password"
                          value={createUserForm.password}
                          onChange={(e) => { const n = { ...createUserForm, password: e.target.value }; setCreateUserForm(n); setDraft(`${DRAFT_KEY}:createUser`, n); }}
                          required
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#f5f7fc] flex-1 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 cursor-pointer"
                            value={createUserForm.role}
                            onChange={(e) => { const n = { ...createUserForm, role: e.target.value as Role }; setCreateUserForm(n); setDraft(`${DRAFT_KEY}:createUser`, n); }}
                          >
                            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button type="submit" className={`${btnPrimary} w-full sm:w-auto`}>Create</button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Users list */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Filter bar */}
              <div className="px-3 sm:px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2.5">
                <span className="w-full sm:w-auto text-sm font-semibold text-gray-700 sm:mr-1">
                  Users
                  <span className="ml-1.5 text-xs font-medium text-gray-400">({resolvedUsers.length})</span>
                </span>
                <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {userStatuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setUserStatus(s); setDraft(`${DRAFT_KEY}:userStatus`, s); }}
                      className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        userStatus === s
                          ? "bg-brand-primary text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setDraft(`${DRAFT_KEY}:userSearch`, e.target.value); }}
                      placeholder="Search users..."
                      className="w-full sm:w-44 pl-8 pr-3 py-2 sm:py-1.5 text-xs border border-gray-200 rounded-lg bg-[#f5f7fc] focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <button onClick={() => void loadUsers()} className={`${btnBase} bg-gray-100 text-gray-700 hover:bg-gray-200`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    Refresh
                  </button>
                </div>
              </div>

              {usersLoading ? (
                <div className="py-12 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-400 mt-3">Loading users…</p>
                </div>
              ) : resolvedUsers.length === 0 ? (
                <div className="py-12 text-center">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  <p className="text-sm text-gray-400">No users found for this filter.</p>
                </div>
              ) : (
                <motion.div
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                >
                  {resolvedUsers.map((user) => (
                    <motion.div
                      key={user.id}
                      variants={staggerChildVariants}
                      className={`bg-white rounded-xl border flex flex-col transition-shadow hover:shadow-md ${
                        user.status === "Pending" ? "border-blue-300" : "border-gray-200"
                      }`}
                    >
                      {/* Card body */}
                      <div className="p-3.5 sm:p-4 flex flex-col gap-3 flex-1">
                          {/* Avatar + name + status badge top-right */}
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(user.fullName)}`}>
                            {getInitials(user.fullName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 truncate leading-tight">{user.fullName}</div>
                            <div className="text-xs text-gray-400 truncate mt-0.5">{user.email}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${userStatusBadge(user.status)}`}>
                            {user.status}
                          </span>
                        </div>

                        {/* Role badge + joined date */}
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${roleBadge(user.role)}`}>
                            {user.role ?? "unassigned"}
                          </span>
                          <span className="ml-auto text-[10px] text-gray-400 tabular-nums">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {user.rejectedReason && (
                          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-2 py-1.5">Reason: {user.rejectedReason}</p>
                        )}

                        {/* Role selector */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-auto pt-1">
                          <select
                            value={selectedRoleByUser[user.id] ?? user.role ?? "client"}
                            onChange={(e) => {
                              const newRole = e.target.value as Role;
                              if (user.status === "Active") {
                                setRoleChangeTarget({ user, role: newRole });
                              } else {
                                setSelectedRoleByUser((v) => ({ ...v, [user.id]: newRole }));
                              }
                            }}
                            disabled={user.status === "Archived" || user.status === "Rejected"}
                            className="w-full border border-gray-200 rounded-md px-2 py-2 sm:py-1.5 text-xs bg-[#f5f7fc] cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-primary/30 flex-1 min-w-0 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Card footer: secondary + destructive actions */}
                      <div className="border-t border-gray-100 px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2 bg-gray-50 rounded-b-xl">
                        <div className="flex items-center gap-1.5">
                          {user.status === "Pending" ? (
                            <>
                              <button onClick={() => void approveUser(user.id)} className={btnGreen}>Accept</button>
                              <button onClick={() => setRejectUserTarget(user)} className={btnOrange}>Reject</button>
                            </>
                          ) : user.status === "Archived" ? (
                            <button onClick={() => void unarchiveUser(user.id)} className={btnCyan}>Unarchive</button>
                          ) : (
                            <button onClick={() => setArchiveUserTarget(user)} className={btnGray}>Archive</button>
                          )}
                        </div>
                        {user.status === "Archived" && (
                          <button onClick={() => setDeleteUserTarget(user)} className={btnRed}>Delete</button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* INVITES TAB */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {mainTab === "invites" && (
          <motion.div
            key="invites-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitionFast}
            className="space-y-5"
          >
            {/* Create invite panel */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setCreateInviteOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  <span className="text-sm font-semibold text-brand-primary">Create Invite Code</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${createInviteOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </button>
              <AnimatePresence initial={false}>
                {createInviteOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: EASE_STRUCTURAL }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">
                      <form onSubmit={createInvite} className="grid md:grid-cols-3 gap-3 mt-4">
                        <input
                          value={createInviteForm.label}
                          onChange={(e) => { const n = { ...createInviteForm, label: e.target.value }; setCreateInviteForm(n); setDraft(`${DRAFT_KEY}:createInvite`, n); }}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#f5f7fc] focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
                          placeholder="Label (optional)"
                        />
                        <select
                          value={createInviteForm.expiry}
                          onChange={(e) => { const n = { ...createInviteForm, expiry: e.target.value }; setCreateInviteForm(n); setDraft(`${DRAFT_KEY}:createInvite`, n); }}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#f5f7fc] focus:outline-none focus:ring-2 focus:ring-brand-primary/30 cursor-pointer"
                        >
                          <option value="24h">Expires in 24 hours</option>
                          <option value="7d">Expires in 7 days</option>
                          <option value="30d">Expires in 30 days</option>
                          <option value="none">No expiry</option>
                        </select>
                        <button type="submit" className={`${btnGreen} w-full`}>
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                          Generate &amp; Copy Link
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Invites list */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Filter bar */}
              <div className="px-3 sm:px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2.5">
                <span className="w-full sm:w-auto text-sm font-semibold text-gray-700 sm:mr-1">
                  Invite Codes
                  <span className="ml-1.5 text-xs font-medium text-gray-400">({invites.length})</span>
                </span>
                <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {inviteStatuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInviteStatus(s); setDraft(`${DRAFT_KEY}:inviteStatus`, s); }}
                      className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        inviteStatus === s
                          ? "bg-brand-primary text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button onClick={() => void loadInvites()} className={`w-full sm:w-auto sm:ml-auto ${btnBase} bg-gray-100 text-gray-700 hover:bg-gray-200`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Refresh
                </button>
              </div>

              {invitesLoading ? (
                <div className="py-12 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-400 mt-3">Loading invites…</p>
                </div>
              ) : invites.length === 0 ? (
                <div className="py-12 text-center">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  <p className="text-sm text-gray-400">No invite codes found for this filter.</p>
                </div>
              ) : (
                <>
                  <motion.div
                    variants={staggerContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="sm:hidden p-3 space-y-3"
                  >
                    {invites.map((invite) => (
                      <motion.div
                        key={invite.id}
                        variants={staggerChildVariants}
                        className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="inline-flex max-w-full truncate font-mono text-xs font-bold tracking-widest bg-brand-soft text-brand-primary px-2 py-1 rounded-md border border-brand-surface-mid">
                              {invite.code}
                            </span>
                            <p className={`mt-1.5 truncate text-xs ${invite.label ? "text-gray-500" : "text-gray-300 italic"}`}>
                              {invite.label || "No label"}
                            </p>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${inviteStatusBadge(invite.status)}`}>
                            {invite.status}
                          </span>
                        </div>

                        <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                          <div>
                            <dt className="text-[10px] uppercase tracking-wide text-gray-400">Uses</dt>
                            <dd className="mt-0.5 text-xs font-medium text-gray-700 tabular-nums">
                              {invite.useCount}{invite.maxUses ? ` / ${invite.maxUses}` : ""}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[10px] uppercase tracking-wide text-gray-400">Expires</dt>
                            <dd className="mt-0.5 text-xs font-medium text-gray-700">
                              {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "Never"}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button onClick={() => void copyInvite(invite.code)} className={`${btnPrimary} w-full gap-1.5`}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                            Copy Link
                          </button>
                          <button onClick={() => void sendInvite(invite.id)} className={`${btnGreen} w-full gap-1.5`}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                            Email
                          </button>
                          <button onClick={() => void toggleInviteArchive(invite)} className={`${invite.status === "Archived" ? btnCyan : btnGray} w-full`}>
                            {invite.status === "Archived" ? "Unarchive" : "Archive"}
                          </button>
                          {invite.status === "Archived" && (
                            <button onClick={() => setDeleteInviteTarget(invite)} className={`${btnRed} w-full`}>Delete</button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-5 py-2 text-left text-[11px] font-semibold text-gray-400 tracking-wide">Code & Label</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 tracking-wide">Status</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 tracking-wide">Uses</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 tracking-wide">Expires</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-400 tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <motion.tbody
                      variants={staggerContainerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {invites.map((invite) => (
                        <motion.tr
                          key={invite.id}
                          variants={staggerChildVariants}
                          className="border-t border-gray-100 hover:bg-blue-50/30 transition-colors"
                        >
                          {/* Code + label stacked */}
                          <td className="px-5 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-xs font-bold tracking-widest bg-brand-soft text-brand-primary px-2 py-0.5 rounded-md border border-brand-surface-mid w-fit">
                                {invite.code}
                              </span>
                              {invite.label
                                ? <span className="text-[11px] text-gray-500 pl-0.5">{invite.label}</span>
                                : <span className="text-[11px] text-gray-300 pl-0.5 italic">no label</span>
                              }
                            </div>
                          </td>
                          {/* Status */}
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${inviteStatusBadge(invite.status)}`}>
                              {invite.status}
                            </span>
                          </td>
                          {/* Uses */}
                          <td className="px-3 py-2.5 text-xs text-gray-500 tabular-nums">
                            {invite.useCount}{invite.maxUses ? <span className="text-gray-300"> / {invite.maxUses}</span> : ""}
                          </td>
                          {/* Expires */}
                          <td className="px-3 py-2.5 text-xs text-gray-500">
                            {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : <span className="text-gray-300">Never</span>}
                          </td>
                          {/* Actions */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              {/* Icon-only: Copy */}
                              <button
                                onClick={() => void copyInvite(invite.code)}
                                title="Copy invite link"
                                className={`${btnBase} px-2 py-1.5 bg-brand-primary text-white hover:bg-brand-primary-hover`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                              </button>
                              {/* Icon-only: Email */}
                              <button
                                onClick={() => void sendInvite(invite.id)}
                                title="Send invite email"
                                className={`${btnBase} px-2 py-1.5 bg-brand-accent text-brand-primary hover:bg-brand-accent-strong`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                              </button>
                              {/* Archive / Unarchive — labeled */}
                              <button onClick={() => void toggleInviteArchive(invite)} className={`${btnBase} px-2.5 py-1.5 ${invite.status === "Archived" ? "bg-brand-secondary text-white hover:opacity-90" : "bg-gray-500 text-white hover:bg-gray-600"}`}>
                                {invite.status === "Archived" ? "Unarchive" : "Archive"}
                              </button>
                              {/* Delete — labeled, only when archived */}
                              {invite.status === "Archived" && (
                                <button onClick={() => setDeleteInviteTarget(invite)} className={`${btnBase} px-2.5 py-1.5 bg-red-600 text-white hover:bg-red-700`}>Delete</button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Confirmation Modals ── */}

      <Modal
        open={!!rejectUserTarget}
        onClose={() => {
          setRejectUserTarget(null);
          setRejectionReason("");
        }}
        title="Reject User"
        description={`Reject ${rejectUserTarget?.fullName ?? "this user"}? You can include a reason for this decision.`}
        variant="danger"
        confirmLabel="Reject"
        onConfirm={rejectUser}
        loading={modalLoading}
        cancelLabel="Cancel"
      >
        <label className="block text-sm font-medium text-gray-700" htmlFor="rejection-reason">
          Reason <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="rejection-reason"
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder="Add a reason for rejecting this user"
          rows={4}
          disabled={modalLoading}
          className="mt-2 w-full resize-y rounded-lg border border-gray-200 bg-[#f5f7fc] px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </Modal>

      <Modal
        open={!!archiveUserTarget}
        onClose={() => setArchiveUserTarget(null)}
        title="Archive User"
        description={`Archive ${archiveUserTarget?.fullName ?? "this user"}? They will lose access and can be restored later.`}
        confirmLabel="Archive"
        onConfirm={() => archiveUser(archiveUserTarget!.id)}
        loading={modalLoading}
        cancelLabel="Cancel"
      />

      <Modal
        open={!!deleteUserTarget}
        onClose={() => setDeleteUserTarget(null)}
        title="Delete User"
        description={`Permanently delete ${deleteUserTarget?.fullName ?? "this user"} (${deleteUserTarget?.email ?? ""})? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={() => deleteUser(deleteUserTarget!.id)}
        loading={modalLoading}
        cancelLabel="Cancel"
      />

      <Modal
        open={!!roleChangeTarget}
        onClose={() => setRoleChangeTarget(null)}
        title="Change Role"
        confirmLabel="Confirm Change"
        onConfirm={async () => {
          if (!roleChangeTarget) return;
          setModalLoading(true);
          try {
            await withError(async () => {
              await updateRole(roleChangeTarget.user.id, roleChangeTarget.role);
            });
          } finally {
            setModalLoading(false);
            setRoleChangeTarget(null);
          }
        }}
        loading={modalLoading}
        cancelLabel="Cancel"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            You're about to change the role for <span className="font-semibold text-gray-900">{roleChangeTarget?.user.fullName}</span>.
          </p>
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
            <div className="flex flex-col items-center gap-0.5 flex-1 text-center">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Current</span>
              <span className="text-sm font-semibold text-gray-700 capitalize">{roleChangeTarget?.user.role ?? "unassigned"}</span>
            </div>
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <div className="flex flex-col items-center gap-0.5 flex-1 text-center">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">New</span>
              <span className="text-sm font-semibold text-brand-primary capitalize">{roleChangeTarget?.role}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400">This will take effect immediately and may change what the user can access.</p>
        </div>
      </Modal>

      <Modal
        open={!!archiveInviteTarget}
        onClose={() => setArchiveInviteTarget(null)}
        title="Archive Invite Code"
        description={`Archive invite code ${archiveInviteTarget?.code ?? ""}? It will no longer be usable for registration.`}
        confirmLabel="Archive"
        onConfirm={confirmArchiveInvite}
        loading={modalLoading}
        cancelLabel="Cancel"
      />

      <Modal
        open={!!deleteInviteTarget}
        onClose={() => setDeleteInviteTarget(null)}
        title="Delete Invite Code"
        description={`Permanently delete invite code ${deleteInviteTarget?.code ?? ""}? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={() => deleteInvite(deleteInviteTarget!)}
        loading={modalLoading}
        cancelLabel="Cancel"
      />
    </div>
  );
}
