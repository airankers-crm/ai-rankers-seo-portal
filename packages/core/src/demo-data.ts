import type { DemoActivity, DemoClient, DemoMetric, DemoReport } from "./types";

export const demoClient: DemoClient = {
  id: "tony-roofing",
  businessName: "Tony Roofing",
  initials: "TR",
  services: ["Website SEO", "GBP SEO"],
  status: "Active",
  lastPublished: "Nov 4, 2026",
};

export const demoClients: DemoClient[] = [demoClient];

export const demoMetrics: Record<string, DemoMetric> = {
  organicTraffic: {
    id: "ga4-organic-sessions",
    label: "Organic traffic",
    value: 8426,
    source: "GA4",
    history: [
      { label: "Jun", value: 5120 }, { label: "Jul", value: 5940 }, { label: "Aug", value: 6380 },
      { label: "Sep", value: 7010 }, { label: "Oct", value: 7118 }, { label: "Nov", value: 8426 },
    ],
  },
  impressions: { id: "gsc-impressions", label: "Search impressions", value: 124800, source: "GSC", history: [{ label: "Oct", value: 100000 }, { label: "Nov", value: 124800 }] },
  topTen: { id: "kw-top10", label: "Keywords in top 10", value: 68, source: "DATAFORSEO", history: [{ label: "Oct", value: 60 }, { label: "Nov", value: 68 }] },
  calls: { id: "gbp-calls", label: "GBP calls generated", value: 142, source: "GBP", history: [{ label: "Oct", value: 130 }, { label: "Nov", value: 142 }] },
};

export const demoActivities: DemoActivity[] = [
  { id: "activity-1", title: "Service pages optimized", category: "Website SEO", date: "Today", status: "COMPLETED" },
  { id: "activity-2", title: "Review response workflow prepared", category: "GBP SEO", date: "Yesterday", status: "IN_PROGRESS" },
  { id: "activity-3", title: "Internal linking pass completed", category: "Website SEO", date: "Oct 30, 2026", status: "COMPLETED" },
];

export const demoReports: DemoReport[] = [
  { id: "report-1", title: "October SEO performance report", type: "Monthly SEO", period: "October 2026" },
  { id: "report-2", title: "Local visibility snapshot", type: "GBP ranking", period: "October 2026" },
  { id: "report-3", title: "Technical cleanup summary", type: "Website audit", period: "Q4 2026" },
];
