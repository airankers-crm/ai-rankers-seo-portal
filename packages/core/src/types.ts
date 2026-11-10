export type MetricSource = "MANUAL" | "GSC" | "GA4" | "GBP" | "DATAFORSEO";
export type ActivityStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED";

export type MetricHistoryPoint = {
  label: string;
  value: number;
};

export type DemoMetric = {
  id: string;
  label: string;
  value: number;
  source: MetricSource;
  history: MetricHistoryPoint[];
};

export type DemoClient = {
  id: string;
  businessName: string;
  initials: string;
  services: string[];
  status: "Active" | "Paused";
  lastPublished: string;
  draftCount?: number;
  portalUsers?: number;
  publishedMetrics?: number;
};

export type DemoActivity = {
  id: string;
  title: string;
  category: string;
  date: string;
  status: ActivityStatus;
};

export type DemoReport = {
  id: string;
  title: string;
  type: string;
  period: string;
};
