"use client";

import { Flag, Plus, Sparkles, WandSparkles, X } from "lucide-react";
import { FormEvent, useState } from "react";

type MetricOption = { id: string; name: string; valueFormat: string };
type GoalSummary = { id: string; name: string; target: string; metricName: string | null; status: string };

export function GoalManagement({ clientId, metrics, initialGoals }: { clientId: string; metrics: MetricOption[]; initialGoals: GoalSummary[] }) {
  const [goals, setGoals] = useState(initialGoals);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metricId, setMetricId] = useState(metrics[0]?.id ?? "");
  const [target, setTarget] = useState("");
  const [condition, setCondition] = useState("GREATER_THAN_OR_EQUAL");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [annotationGoalId, setAnnotationGoalId] = useState<string | null>(null);
  const [annotationTitle, setAnnotationTitle] = useState("");
  const [annotationBody, setAnnotationBody] = useState("");
  const [annotationDate, setAnnotationDate] = useState("2026-11-05");
  const [annotationPending, setAnnotationPending] = useState(false);

  async function createGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/admin/clients/${clientId}/goals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, description, metricId, target, condition, startDate, endDate, isVisible: true }) });
    const body = await response.json().catch(() => null) as { error?: string; goal?: { id: string; name: string; target: string; metric?: { name: string } | null; status: string } } | null;
    if (!response.ok || !body?.goal) {
      setError(body?.error || "We could not create this goal.");
      setPending(false);
      return;
    }
    setGoals((current) => [...current, { id: body.goal!.id, name: body.goal!.name, target: body.goal!.target, metricName: body.goal!.metric?.name ?? null, status: body.goal!.status }]);
    setName("");
    setDescription("");
    setTarget("");
    setMessage("Goal created and ready for client review");
    setOpen(false);
    setPending(false);
  }

  async function createAnnotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!annotationGoalId) return;
    setAnnotationPending(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/admin/clients/${clientId}/goals/${annotationGoalId}/annotations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: annotationTitle, body: annotationBody, happenedAt: annotationDate }) });
    const body = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      setError(body?.error || "We could not add this milestone.");
      setAnnotationPending(false);
      return;
    }
    setAnnotationTitle("");
    setAnnotationBody("");
    setAnnotationGoalId(null);
    setMessage("Milestone added and published to the client portal");
    setAnnotationPending(false);
  }

  return <section className="card panel goal-management"><div className="panel-heading"><div><p className="eyebrow">Outcome planning</p><h2>Custom goals</h2><p>Give the client a clear target without turning the portal into an operations console.</p></div><Flag size={18} color="#f26b38" /></div><div className="goal-management-toolbar"><span className="panel-meta">{goals.length} configured</span><button className="button primary" type="button" onClick={() => { setOpen((current) => !current); setError(""); }}><Plus size={14} /> New goal</button></div>{message && <p className="save-status">{message}</p>}{error && <p className="auth-error">{error}</p>}{open && <form className="goal-form" onSubmit={createGoal}><label>Goal name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Grow organic traffic" required /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What outcome are we working toward?" rows={3} /></label><div className="goal-form-grid"><label>Metric<select value={metricId} onChange={(event) => setMetricId(event.target.value)} required><option value="">Choose a metric</option>{metrics.map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label><label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="GREATER_THAN_OR_EQUAL">Greater than or equal to</option><option value="LESS_THAN_OR_EQUAL">Less than or equal to</option><option value="EQUALS">Equals</option></select></label><label>Target<input type="number" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="9000" required /></label><label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label><label>End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label></div><div className="form-actions"><span className="label-hint"><Sparkles size={12} /> Visible to the client immediately</span><button className="button primary" type="submit" disabled={pending}>{pending ? "Creating…" : "Create goal"}</button></div></form>}{goals.length === 0 ? <div className="goal-empty"><Flag size={17} /><div><strong>No goals configured</strong><p>Start with one measurable outcome tied to a published metric.</p></div></div> : <div className="goal-admin-list">{goals.map((goal) => <div className="goal-admin-block" key={goal.id}><div className="goal-admin-row"><div className="list-icon"><Flag size={14} /></div><div className="list-body"><strong>{goal.name}</strong><span>{goal.metricName ?? "Unlinked metric"} · target {goal.target}</span></div><span className={`status ${goal.status === "ACHIEVED" ? "complete" : "progress"}`}>{goal.status.toLowerCase()}</span><button className="icon-button" type="button" aria-label={`Add milestone to ${goal.name}`} onClick={() => { setAnnotationGoalId((current) => current === goal.id ? null : goal.id); setError(""); }}><WandSparkles size={14} /></button></div>{annotationGoalId === goal.id && <form className="milestone-form" onSubmit={createAnnotation}><div className="milestone-form-heading"><span><Sparkles size={13} /> Add achievement highlight</span><button className="icon-button" type="button" aria-label="Close milestone form" onClick={() => setAnnotationGoalId(null)}><X size={13} /></button></div><label>Milestone title<input value={annotationTitle} onChange={(event) => setAnnotationTitle(event.target.value)} placeholder="Service page refresh launched" required /></label><label>What changed?<textarea value={annotationBody} onChange={(event) => setAnnotationBody(event.target.value)} placeholder="Add context the client will understand." rows={2} /></label><div className="milestone-form-footer"><label>Date<input type="date" value={annotationDate} onChange={(event) => setAnnotationDate(event.target.value)} required /></label><button className="button primary" type="submit" disabled={annotationPending}>{annotationPending ? "Saving…" : "Publish milestone"}</button></div></form>}</div>)}</div>}</section>;
}
