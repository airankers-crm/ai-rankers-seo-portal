"use client";

import { useState } from "react";
import { Check, ShieldCheck, UserRound } from "lucide-react";

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "CLIENT";
  status: "ACTIVE" | "INVITED" | "DISABLED";
  client: { id: string; businessName: string } | null;
};

type ClientOption = { id: string; businessName: string };

export function UserManagement({ initialUsers, clients }: { initialUsers: ManagedUser[]; clients: ClientOption[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  return <section className="card panel user-management"><div className="panel-heading"><div><p className="eyebrow">Access control</p><h2>Users and roles</h2><p>Keep every workspace assignment explicit and reversible.</p></div><ShieldCheck size={18} color="#148f83" /></div><div className="form-actions user-feedback"><span className="save-status">{error || message}</span><span className="panel-meta">{users.length} users</span></div><div className="user-list">{users.length === 0 ? <div className="empty-state"><UserRound size={18} /><p>No users yet. Send the first client invitation from a workspace.</p></div> : users.map((user) => <div className="user-row" key={user.id}><div className="user-identity"><span className="avatar user-avatar">{user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><span>{user.email}</span></div></div><label className="user-control"><span>Role</span><select value={user.role} disabled={savingId === user.id} onChange={(event) => updateUser(user.id, { role: event.target.value as ManagedUser["role"] })}><option value="SUPER_ADMIN">Super admin</option><option value="ADMIN">Admin</option><option value="CLIENT">Client</option></select></label><label className="user-control"><span>Workspace</span><select value={user.client?.id ?? ""} disabled={savingId === user.id || user.role !== "CLIENT"} onChange={(event) => updateUser(user.id, { clientId: event.target.value || null })}><option value="">No workspace</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}</select></label><label className="user-control"><span>Status</span><select value={user.status} disabled={savingId === user.id} onChange={(event) => updateUser(user.id, { status: event.target.value as ManagedUser["status"] })}><option value="ACTIVE">Active</option><option value="INVITED">Invited</option><option value="DISABLED">Disabled</option></select></label><span className={`status ${user.status === "ACTIVE" ? "complete" : user.status === "INVITED" ? "progress" : "muted"}`}>{user.status === "ACTIVE" ? <Check size={12} /> : null}{user.status.toLowerCase()}</span></div>)}</div></section>;
}
