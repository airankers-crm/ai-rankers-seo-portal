"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { DemoActivity } from "@ai-rankers/core";
import { demoActivities, demoClient } from "@ai-rankers/core";
import { AppShell } from "./app-shell";
import { EmptyState } from "./ui/primitives";
import { ClientTaskCenter, type ClientTask } from "./client-task-center";

type ActivityCenterProps = {
  businessName?: string;
  brandMark?: string | null;
  brandAccent?: string;
  activities?: DemoActivity[];
  tasks?: ClientTask[];
};

type ActivityStatusFilter = "All statuses" | "Planned" | "Completed" | "In progress";

function activityStatusLabel(status: DemoActivity["status"]) {
  return status === "COMPLETED" ? "Completed" : status === "PLANNED" ? "Planned" : "In progress";
}

export function ActivityCenter({ businessName, brandMark, brandAccent, activities = demoActivities, tasks = [] }: ActivityCenterProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All workstreams");
  const [status, setStatus] = useState<ActivityStatusFilter>("All statuses");
  const [presetSaved, setPresetSaved] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<DemoActivity | null>(null);
  const clientName = businessName ?? demoClient.businessName;
  const accent = brandAccent ?? "#F26B38";
  const mark = brandMark ?? clientName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const categories = useMemo(() => ["All workstreams", ...Array.from(new Set(activities.map((activity) => activity.category)))], [activities]);
  const filteredActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return activities.filter((activity) => {
      const matchesQuery = !normalizedQuery || `${activity.title} ${activity.category} ${activity.date}`.toLowerCase().includes(normalizedQuery);
      const matchesCategory = category === "All workstreams" || activity.category === category;
      const matchesStatus = status === "All statuses" || (status === "Planned" ? activity.status === "PLANNED" : status === "Completed" ? activity.status === "COMPLETED" : activity.status === "IN_PROGRESS");
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [activities, category, query, status]);
  const completedCount = activities.filter((activity) => activity.status === "COMPLETED").length;
  const plannedCount = activities.filter((activity) => activity.status === "PLANNED").length;
  const inProgressCount = activities.filter((activity) => activity.status === "IN_PROGRESS").length;

  function exportCsv() {
    const rows = [
      ["Activity", "Workstream", "Date", "Status"],
      ...filteredActivities.map((activity) => [activity.title, activity.category, activity.date, activityStatusLabel(activity.status)]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${clientName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-activity-log.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function savePreset() {
    window.localStorage.setItem("ai-rankers-activity-view", JSON.stringify({ query, category, status }));
    setPresetSaved(true);
  }

  return (
    <AppShell mode="portal" clientName={clientName} brandMark={mark} brandAccent={accent} activeNav="Activities">
      <div className="content">
        <div className="page-heading activity-heading">
          <div>
            <p className="eyebrow">Client portal / Activities</p>
            <h1>SEO activity</h1>
            <p>{clientName} · Client-visible completed and in-progress work.</p>
          </div>
          <div className="heading-actions">
            <button className="button" type="button" onClick={exportCsv}><Download size={14} /> Export CSV</button>
            <button className={`button${presetSaved ? " saved" : ""}`} type="button" onClick={savePreset}><Bookmark size={14} /> {presetSaved ? "View saved" : "Save view"}</button>
          </div>
        </div>

        <section className="card activity-toolbar" aria-label="Activity filters">
          <div className="activity-toolbar-title"><Filter size={15} /><span>Filter activity</span></div>
          <label className="activity-search"><Search size={15} /><span className="sr-only">Search activity</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity, workstream…" /></label>
          <select aria-label="Filter by workstream" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as ActivityStatusFilter)}><option>All statuses</option><option>Planned</option><option>In progress</option><option>Completed</option></select>
          {(query || category !== "All workstreams" || status !== "All statuses") && <button className="clear-filters" type="button" onClick={() => { setQuery(""); setCategory("All workstreams"); setStatus("All statuses"); }}><X size={13} /> Clear</button>}
        </section>

          <div className="activity-summary" aria-label="Activity summary">
          <div><strong>{filteredActivities.length}</strong><span>visible activities</span></div>
          <div><strong>{completedCount}</strong><span>completed</span></div>
          <div><strong>{inProgressCount}</strong><span>in progress</span></div>
          <div><strong>{plannedCount}</strong><span>planned</span></div>
          <div className="activity-summary-note"><Sparkles size={15} /><span>Activity records are visible after agency publication.</span></div>
        </div>

        <section className="card activity-panel" aria-labelledby="activity-log-title">
          <div className="activity-panel-heading"><div><p className="eyebrow">Activity records</p><h2 id="activity-log-title">SEO work</h2><p>Published completed, in-progress, and planned work by service.</p></div><span className="panel-meta">{activities.length} total</span></div>
          {filteredActivities.length === 0 ? <EmptyState message="No activities match these filters. Try a broader search or clear the current view." /> : <div className="activity-table-wrap"><table className="activity-table"><thead><tr><th>Activity</th><th>Workstream</th><th>Date</th><th>Status</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{filteredActivities.map((activity) => <tr key={activity.id}><td><div className="activity-name"><span className={`activity-status-icon ${activity.status === "COMPLETED" ? "complete" : activity.status === "PLANNED" ? "planned" : "progress"}`}>{activity.status === "COMPLETED" ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}</span><strong>{activity.title}</strong></div></td><td><span className="workstream-tag">{activity.category}</span></td><td className="activity-date">{activity.date}</td><td><span className={`status ${activity.status === "COMPLETED" ? "complete" : activity.status === "PLANNED" ? "planned" : "progress"}`}>{activity.status === "COMPLETED" ? "Completed" : activity.status === "PLANNED" ? "Planned" : "In progress"}</span></td><td className="activity-detail-cell"><button className="table-action" type="button" onClick={() => setSelectedActivity(activity)}>View details</button></td></tr>)}</tbody></table></div>}
        </section>

        <ClientTaskCenter initialTasks={tasks} />
      </div>
      {selectedActivity && <ActivityDetail activity={selectedActivity} onClose={() => setSelectedActivity(null)} />}
    </AppShell>
  );
}

function ActivityDetail({ activity, onClose }: { activity: DemoActivity; onClose: () => void }) {
  const statusLabel = activityStatusLabel(activity.status);
  const statusDescription = activity.status === "COMPLETED" ? "This activity is published in the client workspace." : activity.status === "PLANNED" ? "This activity is published as planned work for the current reporting plan." : "The agency team is currently working on this activity.";
  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="report-modal activity-modal" role="dialog" aria-modal="true" aria-labelledby="activity-detail-title" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">Activity detail</p><h2 id="activity-detail-title">{activity.title}</h2><p>{activity.category} · {activity.date}</p></div><button className="icon-button" type="button" aria-label="Close activity details" onClick={onClose}><X size={16} /></button></div><div className="report-preview-note"><CheckCircle2 size={16} /><div><strong>{statusLabel}</strong><p>{statusDescription}</p></div></div><div className="report-preview-grid"><div><span>Workstream</span><strong>{activity.category}</strong></div><div><span>Timing</span><strong>{activity.date}</strong></div><div><span>Owner</span><strong>SEO team</strong></div></div><div className="modal-actions"><button className="button" type="button" onClick={onClose}>Close</button></div></section></div>;
}
