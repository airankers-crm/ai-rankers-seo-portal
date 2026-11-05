import { CheckCircle2, Flag, Sparkles, Target } from "lucide-react";

export type PortalGoal = {
  id: string;
  name: string;
  description: string | null;
  target: number;
  current: number | null;
  metricName: string | null;
  valueFormat: string | null;
  condition: "GREATER_THAN_OR_EQUAL" | "LESS_THAN_OR_EQUAL" | "EQUALS";
  status: "ACTIVE" | "ACHIEVED" | "PAUSED" | "ARCHIVED";
  startDate: string;
  endDate: string;
  annotations: { id: string; title: string; body: string | null; happenedAt: string }[];
};

function formatValue(value: number | null, format: string | null) {
  if (value === null) return "Not connected";
  if (format === "PERCENT") return `${value.toFixed(1)}%`;
  if (format === "CURRENCY") return `$${value.toLocaleString()}`;
  return value.toLocaleString();
}

function goalProgress(goal: PortalGoal) {
  if (goal.current === null || goal.target === 0) return 0;
  if (goal.condition === "LESS_THAN_OR_EQUAL") return goal.current <= goal.target ? 100 : Math.max(0, Math.min(100, (goal.target / goal.current) * 100));
  if (goal.condition === "EQUALS") return goal.current === goal.target ? 100 : Math.max(0, Math.min(99, (goal.current / goal.target) * 100));
  return Math.max(0, Math.min(100, (goal.current / goal.target) * 100));
}

function goalState(goal: PortalGoal, progress: number) {
  if (goal.status === "ACHIEVED" || progress >= 100) return { label: "Achieved", className: "complete" };
  if (goal.status === "PAUSED") return { label: "Paused", className: "muted" };
  if (goal.current === null) return { label: "Awaiting data", className: "progress" };
  return { label: "In progress", className: "progress" };
}

function formatGoalDate(value: string, includeYear = false) {
  return new Date(value).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", ...(includeYear ? { year: "numeric" } : {}) });
}

export function GoalHighlights({ goals }: { goals: PortalGoal[] }) {
  return <section className="card panel goals-panel" id="goals" aria-labelledby="goals-title"><div className="panel-heading"><div><p className="eyebrow">Goals and achievements</p><h2 id="goals-title">Progress clients can understand.</h2><p>Shared targets connect the work your team delivers to the outcomes your client cares about.</p></div><div className="goals-heading-icon"><Target size={18} /></div></div>{goals.length === 0 ? <div className="goal-empty"><Flag size={17} /><div><strong>No goals published yet</strong><p>Your SEO team will add shared targets when the reporting plan is ready.</p></div></div> : <div className="goal-grid">{goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}</div>}</section>;
}

function GoalCard({ goal }: { goal: PortalGoal }) {
  const progress = goalProgress(goal);
  const state = goalState(goal, progress);
  const dateRange = `${formatGoalDate(goal.startDate)} – ${formatGoalDate(goal.endDate, true)}`;
  return <article className="goal-card"><div className="goal-card-top"><div className="goal-icon"><Target size={15} /></div><span className={`status ${state.className}`}>{state.label}</span></div><h3>{goal.name}</h3>{goal.description && <p className="goal-description">{goal.description}</p>}<div className="goal-values"><div><span>Current</span><strong>{formatValue(goal.current, goal.valueFormat)}</strong></div><div className="goal-progress-copy"><span>{goal.metricName ?? "Target metric"}</span><strong>{Math.round(progress)}%</strong></div><div><span>Target</span><strong>{formatValue(goal.target, goal.valueFormat)}</strong></div></div><div className="goal-progress-track"><div className={`goal-progress-fill ${state.className}`} style={{ width: `${Math.max(progress, goal.current === null ? 0 : 3)}%` }} /></div><div className="goal-card-foot"><span>{dateRange}</span><span>{goal.condition === "LESS_THAN_OR_EQUAL" ? "Keep below target" : "Reach target"}</span></div>{goal.annotations.length > 0 && <div className="goal-achievements"><div className="goal-achievements-heading"><Sparkles size={13} /><span>Milestones</span></div>{goal.annotations.map((annotation) => <div className="goal-achievement" key={annotation.id}><CheckCircle2 size={14} /><div><strong>{annotation.title}</strong>{annotation.body && <p>{annotation.body}</p>}<small>{formatGoalDate(annotation.happenedAt, true)}</small></div></div>)}</div>}</article>;
}
