import { FormEvent, useEffect, useMemo, useState } from "react";
import type { InviteCodeDTO, Role, UserManagementDTO, UserStatus } from "@icp/shared";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";

const userStatuses: Array<UserStatus | "All"> = ["All", "Pending", "Active", "Rejected", "Archived"];
const inviteStatuses: Array<"All" | "Active" | "Archived" | "Expired"> = ["All", "Active", "Archived", "Expired"];
const roles: Role[] = ["admin", "editor", "client"];
const DRAFT_KEY = "form:users-admin";

function statusBadge(status: UserStatus) {
  if (status === "Active") return "bg-green-100 text-green-700";
  if (status === "Pending") return "bg-brand-soft text-brand-secondary";
  if (status === "Rejected") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
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

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, Role>>({});

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

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await apiClient.listUsers(userStatus, userSearch);
      setUsers(data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load users");
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
      setError(err instanceof ApiClientError ? err.message : "Failed to load invites");
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [userStatus]);

  useEffect(() => {
    void loadInvites();
  }, [inviteStatus]);

  const clearAlerts = () => {
    setError(null);
    setSuccess(null);
  };

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    clearAlerts();
    try {
      await action();
      setSuccess(successMessage);
      await Promise.all([loadUsers(), loadInvites()]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action failed");
    }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      await apiClient.createUser(createUserForm);
      setCreateUserForm({ fullName: "", email: "", password: "", role: "client" });
      clearDraft(`${DRAFT_KEY}:createUser`);
    }, "User created");
  };

  const approveUser = async (userId: string) => {
    const role = selectedRoleByUser[userId];
    if (!role) {
      setError("Select a role before accepting this user.");
      return;
    }

    await runAction(async () => {
      await apiClient.approveUser(userId, { role });
    }, "User approved");
  };

  const rejectUser = async (userId: string) => {
    const reason = window.prompt("Reason for rejection (optional):") ?? undefined;
    await runAction(async () => {
      await apiClient.rejectUser(userId, { reason: reason?.trim() || undefined });
    }, "User rejected");
  };

  const archiveUser = async (userId: string) => {
    if (!window.confirm("Archive this user?")) return;
    await runAction(async () => {
      await apiClient.archiveUser(userId);
    }, "User archived");
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Delete this user permanently?")) return;
    await runAction(async () => {
      await apiClient.deleteUser(userId);
    }, "User deleted");
  };

  const updateRole = async (userId: string, role: Role) => {
    await runAction(async () => {
      await apiClient.updateUserRole(userId, role);
    }, "User role updated");
  };

  const createInvite = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      const now = new Date();
      let expiresAt: string | null = null;
      if (createInviteForm.expiry === "24h") {
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      } else if (createInviteForm.expiry === "7d") {
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (createInviteForm.expiry === "30d") {
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const payload = await apiClient.createInvite({
        label: createInviteForm.label.trim() || undefined,
        expiresAt,
      });

      await navigator.clipboard.writeText(payload.inviteLink);
      setCreateInviteForm({ label: "", expiry: "7d" });
      clearDraft(`${DRAFT_KEY}:createInvite`);
      setSuccess("Invite created and link copied to clipboard.");
    }, "Invite created");
  };

  const sendInvite = async (inviteId: string) => {
    const toEmail = window.prompt("Send invite to email:");
    if (!toEmail) return;
    await runAction(async () => {
      await apiClient.sendInviteEmail(inviteId, { toEmail: toEmail.trim() });
    }, "Invite email sent");
  };

  const copyInvite = async (code: string) => {
    const origin = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ?? window.location.origin;
    const link = `${origin.replace(/\/+$/, "")}/register?code=${encodeURIComponent(code)}`;
    await navigator.clipboard.writeText(link);
    setSuccess("Invite link copied");
  };

  const toggleInviteArchive = async (invite: InviteCodeDTO) => {
    await runAction(async () => {
      if (invite.status === "Archived") {
        await apiClient.unarchiveInvite(invite.id);
      } else {
        await apiClient.archiveInvite(invite.id);
      }
    }, invite.status === "Archived" ? "Invite unarchived" : "Invite archived");
  };

  return (
    <div>
      <section className="bg-brand-primary py-16">
        <div className="max-w-[80rem] mx-auto px-6">
          <span className="text-brand-accent text-sm tracking-widest uppercase">Administration</span>
          <h1 className="text-white mt-2" style={{ fontSize: "2.4rem", fontWeight: 800 }}>User Management</h1>
          <p className="text-gray-400 mt-2 max-w-2xl">Manage account approvals, lifecycle status, roles, and invite codes.</p>
        </div>
      </section>

      <section className="max-w-[80rem] mx-auto px-6 py-10 space-y-6">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}
        {success && <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">{success}</div>}

        <div className="flex gap-2 border-b border-gray-100 pb-2">
          <button
            onClick={() => {
              setMainTab("users");
              setDraft(`${DRAFT_KEY}:mainTab`, "users");
            }}
            className={`px-4 py-2 rounded-lg text-sm ${mainTab === "users" ? "bg-brand-accent text-brand-primary" : "bg-gray-100 text-gray-600"}`}
          >
            Users
          </button>
          <button
            onClick={() => {
              setMainTab("invites");
              setDraft(`${DRAFT_KEY}:mainTab`, "invites");
            }}
            className={`px-4 py-2 rounded-lg text-sm ${mainTab === "invites" ? "bg-brand-accent text-brand-primary" : "bg-gray-100 text-gray-600"}`}
          >
            Invites
          </button>
        </div>

        {mainTab === "users" ? (
          <>
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h3 className="text-brand-primary" style={{ fontWeight: 700 }}>Create Active User</h3>
              <form onSubmit={createUser} className="grid md:grid-cols-4 gap-3 mt-4">
                <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Full name" value={createUserForm.fullName} onChange={(e) => {
                  const next = { ...createUserForm, fullName: e.target.value };
                  setCreateUserForm(next);
                  setDraft(`${DRAFT_KEY}:createUser`, next);
                }} required />
                <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Email" value={createUserForm.email} onChange={(e) => {
                  const next = { ...createUserForm, email: e.target.value };
                  setCreateUserForm(next);
                  setDraft(`${DRAFT_KEY}:createUser`, next);
                }} required type="email" />
                <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Password" value={createUserForm.password} onChange={(e) => {
                  const next = { ...createUserForm, password: e.target.value };
                  setCreateUserForm(next);
                  setDraft(`${DRAFT_KEY}:createUser`, next);
                }} required type="password" />
                <div className="flex gap-2">
                  <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1" value={createUserForm.role} onChange={(e) => {
                    const next = { ...createUserForm, role: e.target.value as Role };
                    setCreateUserForm(next);
                    setDraft(`${DRAFT_KEY}:createUser`, next);
                  }}>
                    {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <button className="bg-brand-primary text-white rounded-lg px-4 py-2 text-sm">Create</button>
                </div>
              </form>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex flex-wrap gap-2 mb-4">
                {userStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setUserStatus(status);
                      setDraft(`${DRAFT_KEY}:userStatus`, status);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs ${userStatus === status ? "bg-brand-accent text-brand-primary" : "bg-gray-100 text-gray-600"}`}
                  >
                    {status}
                  </button>
                ))}
                <input
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setDraft(`${DRAFT_KEY}:userSearch`, e.target.value);
                  }}
                  placeholder="Search users..."
                  className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm min-w-[220px]"
                />
                <button onClick={() => void loadUsers()} className="bg-brand-primary text-white rounded-lg px-4 py-1.5 text-sm">Refresh</button>
              </div>

              {usersLoading ? (
                <div className="text-gray-500 text-sm">Loading users...</div>
              ) : (
                <div className="space-y-3">
                  {resolvedUsers.map((user) => (
                    <div key={user.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-brand-primary" style={{ fontWeight: 700 }}>{user.fullName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-1 rounded-full ${statusBadge(user.status)}`}>{user.status}</span>
                          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{user.role ?? "unassigned"}</span>
                        </div>
                      </div>

                      {user.rejectedReason && <div className="mt-2 text-xs text-red-600">Reason: {user.rejectedReason}</div>}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <select
                          value={selectedRoleByUser[user.id] ?? user.role ?? "client"}
                          onChange={(e) => setSelectedRoleByUser((v) => ({ ...v, [user.id]: e.target.value as Role }))}
                          className="border border-gray-200 rounded-md px-2 py-1 text-xs"
                        >
                          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>

                        {user.status !== "Active" && (
                          <button onClick={() => void approveUser(user.id)} className="px-3 py-1.5 rounded-md bg-green-500 text-white text-xs">Accept</button>
                        )}

                        {user.status === "Active" && (
                          <button
                            onClick={() => void updateRole(user.id, selectedRoleByUser[user.id] ?? (user.role as Role ?? "client"))}
                            className="px-3 py-1.5 rounded-md bg-brand-primary text-white text-xs"
                          >
                            Change Role
                          </button>
                        )}

                        {user.status !== "Rejected" && (
                          <button onClick={() => void rejectUser(user.id)} className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs">Reject</button>
                        )}

                        {user.status !== "Archived" && (
                          <button onClick={() => void archiveUser(user.id)} className="px-3 py-1.5 rounded-md bg-gray-500 text-white text-xs">Archive</button>
                        )}

                        <button onClick={() => void deleteUser(user.id)} className="px-3 py-1.5 rounded-md bg-black text-white text-xs">Delete</button>
                      </div>
                    </div>
                  ))}
                  {resolvedUsers.length === 0 && <div className="text-gray-500 text-sm">No users found for this filter.</div>}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h3 className="text-brand-primary" style={{ fontWeight: 700 }}>Create Invite Code</h3>
              <form onSubmit={createInvite} className="grid md:grid-cols-3 gap-3 mt-4">
                <input
                  value={createInviteForm.label}
                  onChange={(e) => {
                    const next = { ...createInviteForm, label: e.target.value };
                    setCreateInviteForm(next);
                    setDraft(`${DRAFT_KEY}:createInvite`, next);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Label (optional)"
                />
                <select
                  value={createInviteForm.expiry}
                  onChange={(e) => {
                    const next = { ...createInviteForm, expiry: e.target.value };
                    setCreateInviteForm(next);
                    setDraft(`${DRAFT_KEY}:createInvite`, next);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                  <option value="none">No expiry</option>
                </select>
                <button className="bg-brand-primary text-white rounded-lg px-4 py-2 text-sm">Create Invite</button>
              </form>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex flex-wrap gap-2 mb-4">
                {inviteStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setInviteStatus(status);
                      setDraft(`${DRAFT_KEY}:inviteStatus`, status);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs ${inviteStatus === status ? "bg-brand-accent text-brand-primary" : "bg-gray-100 text-gray-600"}`}
                  >
                    {status}
                  </button>
                ))}
                <button onClick={() => void loadInvites()} className="ml-auto bg-brand-primary text-white rounded-lg px-4 py-1.5 text-sm">Refresh</button>
              </div>

              {invitesLoading ? (
                <div className="text-gray-500 text-sm">Loading invites...</div>
              ) : (
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div key={invite.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-brand-primary" style={{ fontWeight: 700 }}>{invite.code}</div>
                          <div className="text-sm text-gray-500">{invite.label || "No label"}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Status: <span className="font-semibold">{invite.status}</span> | Uses: {invite.useCount}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Expires: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : "No expiry"}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => void copyInvite(invite.code)} className="px-3 py-1.5 rounded-md bg-brand-primary text-white text-xs">Copy Link</button>
                        <button onClick={() => void sendInvite(invite.id)} className="px-3 py-1.5 rounded-md bg-green-500 text-white text-xs">Send Email</button>
                        <button onClick={() => void toggleInviteArchive(invite)} className="px-3 py-1.5 rounded-md bg-gray-600 text-white text-xs">
                          {invite.status === "Archived" ? "Unarchive" : "Archive"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {invites.length === 0 && <div className="text-gray-500 text-sm">No invites found for this filter.</div>}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}




