export type ReportStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "SENT" | "SCHEDULED" | "DATA_DELAYED";
export type ReportMetricStatus = "LIVE" | "PRESENTATION" | "DELAYED" | "UNAVAILABLE";

export type ReportMetricView = {
  key: string;
  label: string;
  value: number | null;
  previousValue: number | null;
  change: number | null;
  direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  definition: string;
  source: string;
  lastSyncedAt: string | null;
  status: ReportMetricStatus;
  format: "INTEGER" | "DECIMAL" | "PERCENT" | "CURRENCY" | "RANK";
};

export type ReportPeriodRow = {
  periodLabel: string;
  periodStart: string;
  organicTraffic: number | null;
  impressions: number | null;
  topTen: number | null;
};

export type ReportSearchDetailRow = {
  label: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
};

export type ReportLifecycleStage = {
  label: string;
  status: "AVAILABLE" | "PARTIAL" | "NOT_CONNECTED";
  source: string;
  detail: string;
};

export type ReportActivityView = {
  id: string;
  date: string;
  type: string;
  title: string;
  description: string;
  status: string;
  owner: string;
  clientVisible: boolean;
};

export type ReportRecommendationView = {
  title: string;
  explanation: string;
  evidence: string;
  impact: "High" | "Medium" | "Low";
  effort: "Low" | "Medium" | "High";
  priority: "P1" | "P2" | "P3";
  status: "Proposed" | "Approved" | "In progress" | "Complete" | "Waiting for client" | "Rejected";
};

export type ReportGoalView = {
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

export type ReportViewModel = {
  report: { id: string; title: string; type: string; periodLabel: string; status: ReportStatus; publishedAt: string; updatedAt: string };
  client: { businessName: string; brandMark: string; brandAccent: string; websiteUrl: string | null };
  period: { label: string; comparisonLabel: string; lastDataContext: string };
  summary: { status: "ON_TRACK" | "ATTENTION" | "NO_DATA"; title: string; body: string; highlights: string[]; risks: string[]; nextActions: string[] };
  crm: { lifecycle: ReportLifecycleStage[]; availableNow: string[]; nextConnections: string[] };
  kpis: ReportMetricView[];
  websiteSeo: { rows: ReportPeriodRow[]; highlights: string[]; opportunities: string[]; queryRows: ReportSearchDetailRow[]; pageRows: ReportSearchDetailRow[] };
  goals: ReportGoalView[];
  localSeo: { metrics: { label: string; value: string; status: ReportMetricStatus; source: string }[]; summary: string };
  activities: ReportActivityView[];
  recommendations: ReportRecommendationView[];
  dataSources: { name: string; source: string; status: ReportMetricStatus; lastSuccessfulSync: string; coverage: string }[];
  methodology: string[];
  appendix: { label: string; value: string }[];
};
