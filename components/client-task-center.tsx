"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, ListTodo, Plus, Send } from "lucide-react";

export type ClientTask = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueDate?: string | null;
  assignee?: { name: string } | null;
};

export function ClientTaskCenter({ initialTasks = [] }: { initialTasks?: ClientTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Client request");
  const [priority, setPriority] = useState<ClientTask["priority"]>("NORMAL");
  const [dueDate, setDueDate] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback("");
    setError("");
    const response = await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, description, category, priority, dueDate: dueDate || undefined }) });
    const body = await response.json().catch(() => null) as { task?: ClientTask; error?: string } | null;
    if (!response.ok || !body?.task) {
      setError(body?.error ?? "We could not create this task request.");
      setPending(false);
      return;
    }
    setTasks((current) => [body.task!, ...current]);
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("NORMAL");
    setOpen(false);
    setFeedback("Task request sent to the agency workspace.");
    setPending(false);
  }

  return <section className="card task-center" aria-labelledby="client-task-title"><div className="task-center-head"><div><p className="eyebrow">Client requests</p><h2 id="client-task-title">Tasks for the SEO team</h2><p>Create a task request with delivery context and a requested due date.</p></div><button className="button primary" type="button" onClick={() => { setOpen((current) => !current); setError(""); }}><Plus size={14} /> {open ? "Close form" : "Assign a task"}</button></div>{feedback && <p className="task-feedback" role="status"><CheckCircle2 size={14} /> {feedback}</p>}{error && <p className="auth-error" role="alert">{error}</p>}{open && <form className="task-form" onSubmit={createTask}><label>Task title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Review the new service page" required /></label><label>Context for the team<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain what you want reviewed or delivered." rows={3} /></label><div className="task-form-grid"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Client request</option><option>Website SEO</option><option>GBP SEO</option><option>Reporting</option><option>Technical</option></select></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as ClientTask["priority"])}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></label><label>Requested due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div><div className="task-form-foot"><span><Send size={13} /> The agency team assigns the accountable owner.</span><button className="button primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Send task request"}</button></div></form>}{tasks.length > 0 ? <div className="task-list">{tasks.map((task) => <div className="task-row" key={task.id}><div className="task-row-icon"><ListTodo size={15} /></div><div className="task-row-copy"><strong>{task.title}</strong><span>{task.category} · {task.assignee?.name ?? "Awaiting agency owner"}</span></div><span className={`status ${task.status === "DONE" ? "complete" : task.status === "IN_PROGRESS" ? "progress" : "muted"}`}>{task.status === "TODO" ? "To do" : task.status === "IN_PROGRESS" ? "In progress" : task.status === "DONE" ? "Done" : "Canceled"}</span><div className="task-row-due">{task.dueDate ? <><CalendarClock size={13} /> {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</> : "No due date"}</div></div>)}</div> : null}</section>;
}
