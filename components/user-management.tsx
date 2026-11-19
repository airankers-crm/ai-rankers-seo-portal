"use client";

import { FormEvent, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, ShieldCheck, UserRound, X } from "lucide-react";

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "CLIENT";
  status: "ACTIVE" | "INVITED" | "DISABLED";
  hasAuthAccount: boolean;
  portalPasswordUpdatedAt: string | null;
  client: { id: string; businessName: string } | null;
};

type ClientOption = { id: string; businessName: string };

function formatPasswordDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function UserManagement({ initialUsers, clients }: { initialUsers: ManagedUser[]; clients: ClientOption[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [savingId, setSavingId] = useState("");
  const [passwordUserId, setPasswordUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function openPasswordPanel(user: ManagedUser) {
    setPasswordUserId(user.id);
    setNewPassword("");
    setPasswordConfirmation("");
    setShowPassword(false);
    setMessage("");
    setError("");
  }

  function closePasswordPanel() {
    setPasswordUserId("");
    setNewPassword("");
    setPasswordConfirmation("");
    setShowPassword(false);
  }

  async function updateUser(id: string, changes: Partial<Pick<ManagedUser, "role" | "status">> & { clientId?: string | null }) {
    setSavingId(id);
    setMessage("");
    setError("");
    const response = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(changes) });
    const body = await response.json().catch(() => null) as { error?: string; user?: ManagedUser } | null;
    if (!response.ok || !body?.user) {
      setError(body?.error || "We could not update this user.");
      setSavingId("");
      return;
    }
    setUsers((current) => current.map((user) => user.id === id ? body.user! : user));
    setMessage("Access updated");
    setSavingId("");
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = users.find((item) => item.id === passwordUserId);
    if (!user) return;
    setMessage("");
    setError("");
    if (newPassword.length < 8) {
      setError("Use at least 8 characters for the new portal password.");
      return;
    }
    if (newPassword.length > 128) {
      setError("Use 128 characters or fewer for the new portal password.");
      return;
    }
    if (newPassword !== passwordConfirmation) {
      setError("The password confirmation does not match.");
      return;
    }

    setPasswordSaving(true);
    const response = await fetch(`/api/admin/users/${user.id}/password`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ newPassword, confirmation: passwordConfirmation }) });
    const body = await response.json().catch(() => null) as { error?: string; user?: ManagedUser } | null;
    if (!response.ok || !body?.user) {
      setError(body?.error || "We could not update this portal password.");
      setPasswordSaving(false);
      return;
    }
    setUsers((current) => current.map((item) => item.id === user.id ? body.user! : item));
    setPasswordSaving(false);
    setMessage(`Portal password updated for ${user.name}.`);
    closePasswordPanel();
  }

  return <section className="card panel user-management"><div className="panel-heading"><div><p className="eyebrow">Access control</p><h2>Users and roles</h2><p>Keep every workspace assignment explicit and reversible.</p></div><ShieldCheck size={18} color="#148f83" /></div><div className="user-password-notice"><KeyRound size={16} /><div><strong>Portal password controls</strong><span>Passwords are never displayed or stored in this screen. A super admin can securely set a new password for any portal user.</span></div></div><div className="form-actions user-feedback"><span className="save-status">{error || message}</span><span className="panel-meta">{users.length} users</span></div><div className="user-list">{users.length === 0 ? <div className="empty-state"><UserRound size={18} /><p>No users yet. Send the first client invitation from a workspace.</p></div> : users.map((user) => <div className="user-row" key={user.id}><div className="user-identity"><span className="avatar user-avatar">{user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><span>{user.email}</span></div></div><label className="user-control"><span>Role</span><select value={user.role} disabled={savingId === user.id} onChange={(event) => updateUser(user.id, { role: event.target.value as ManagedUser["role"] })}><option value="SUPER_ADMIN">Super admin</option><option value="ADMIN">Admin</option><option value="CLIENT">Client</option></select></label><label className="user-control"><span>Workspace</span><select value={user.client?.id ?? ""} disabled={savingId === user.id || user.role !== "CLIENT"} onChange={(event) => updateUser(user.id, { clientId: event.target.value || null })}><option value="">No workspace</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}</select></label><label className="user-control"><span>Status</span><select value={user.status} disabled={savingId === user.id} onChange={(event) => updateUser(user.id, { status: event.target.value as ManagedUser["status"] })}><option value="ACTIVE">Active</option><option value="INVITED">Invited</option><option value="DISABLED">Disabled</option></select></label><div className="user-password-control"><span>Password</span><strong>{user.hasAuthAccount ? "Portal account linked" : "Account not linked"}</strong><small>{user.portalPasswordUpdatedAt ? `Last changed ${formatPasswordDate(user.portalPasswordUpdatedAt)}` : "Current value is hidden"}</small><button className="button secondary user-password-action" type="button" disabled={savingId === user.id || passwordSaving} onClick={() => passwordUserId === user.id ? closePasswordPanel() : openPasswordPanel(user)}>{passwordUserId === user.id ? <><X size={13} /> Close</> : <><KeyRound size={13} /> {user.hasAuthAccount ? "Change password" : "Set password"}</>}</button></div><span className={`status ${user.status === "ACTIVE" ? "complete" : user.status === "INVITED" ? "progress" : "muted"}`}>{user.status === "ACTIVE" ? <Check size={12} /> : null}{user.status.toLowerCase()}</span>{passwordUserId === user.id && <form className="user-password-panel" onSubmit={savePassword}><div><strong>{user.hasAuthAccount ? "Change portal password" : "Set portal password"}</strong><p>The current password cannot be viewed. Setting a new one replaces the existing portal password for this user.</p></div><label>New password<input type={showPassword ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /></label><label>Confirm new password<input type={showPassword ? "text" : "password"} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /></label><button className="password-visibility" type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />} {showPassword ? "Hide passwords" : "Show passwords"}</button><div className="user-password-actions"><button className="button primary" type="submit" disabled={passwordSaving}>{passwordSaving ? "Saving…" : "Save password"}</button><button className="button secondary" type="button" onClick={closePasswordPanel} disabled={passwordSaving}>Cancel</button></div></form>}</div>)}</div></section>;
}
