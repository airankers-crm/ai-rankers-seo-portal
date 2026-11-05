import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";

export function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

export function MetricCard({ label, value, trend, icon, tone, positive }: { label: string; value: string; trend: string; icon: React.ReactNode; tone?: string; positive?: boolean }) {
  return <article className="card metric-card reveal-item"><div className="metric-top"><span className="metric-label">{label}</span><span className={`metric-icon ${tone ?? ""}`}>{icon}</span></div><div className="metric-value">{value}</div><div className="metric-foot"><span className={positive ? "trend-up" : "trend-down"}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {trend}</span><span className="metric-period">vs previous period</span></div></article>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty-state"><div className="empty-state-mark"><Sparkles size={15} /></div><p>{message}</p></div>;
}
