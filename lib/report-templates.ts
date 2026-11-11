export type ReportTemplateKind = "website-seo" | "gbp";

export type ReportTemplateSection = {
  key: string;
  label: string;
  description: string;
  visible: boolean;
};

export type ReportTemplateConfig = {
  coverTitle: string;
  coverDescription: string;
  sections: ReportTemplateSection[];
  metrics: string[];
};

export type ReportTemplateDefinition = {
  key: ReportTemplateKind;
  category: "Website SEO" | "GBP performance";
  title: string;
  description: string;
  config: ReportTemplateConfig;
};

export const defaultReportTemplates: ReportTemplateDefinition[] = [
  {
    key: "website-seo",
    category: "Website SEO",
    title: "Website SEO performance",
    description: "A clear search visibility report for organic growth, keyword movement, and landing-page performance.",
    config: {
      coverTitle: "Website SEO performance",
      coverDescription: "Organic sessions, Search Console visibility, keyword coverage, goals, and recommended actions.",
      sections: [
        { key: "summary", label: "Executive summary", description: "A concise readout of the reporting period.", visible: true },
        { key: "scorecard", label: "KPI scorecard", description: "Current values, comparisons, and source definitions.", visible: true },
        { key: "seo-performance", label: "Organic performance trend", description: "Period-level organic search movement.", visible: true },
        { key: "query-detail", label: "Search query detail", description: "Query-level visibility and click detail.", visible: true },
        { key: "page-detail", label: "Landing-page detail", description: "Landing-page visibility and click detail.", visible: true },
        { key: "goals", label: "Goals and milestones", description: "Published targets and achievement highlights.", visible: true },
        { key: "recommendations", label: "Recommendations", description: "Evidence-led next actions.", visible: true },
      ],
      metrics: ["Organic sessions", "Search impressions", "Top-10 keywords", "Average position", "Clicks", "CTR", "Conversions", "Goal progress"],
    },
  },
  {
    key: "gbp",
    category: "GBP performance",
    title: "GBP performance report",
    description: "A local visibility report for Search and Maps discovery, customer actions, and reputation activity.",
    config: {
      coverTitle: "GBP performance report",
      coverDescription: "Search and Maps discovery, customer actions, profile activity, and reputation signals.",
      sections: [
        { key: "summary", label: "Executive summary", description: "A concise readout of the reporting period.", visible: true },
        { key: "discovery", label: "Discovery signals", description: "Search and Maps visibility signals.", visible: true },
        { key: "customer-actions", label: "Customer actions", description: "Calls, website clicks, and direction requests.", visible: true },
        { key: "profile-trend", label: "Profile activity trend", description: "Local activity over time.", visible: true },
        { key: "results-by-period", label: "Results by period", description: "Exact local performance values by period.", visible: true },
        { key: "reputation", label: "Reputation activity", description: "Reviews and reputation activity.", visible: true },
      ],
      metrics: ["Search & Maps impressions", "Call clicks", "Website clicks", "Direction requests", "Reviews received", "Customer actions", "Goal progress"],
    },
  },
];

export function templateDefinition(key: string) {
  return defaultReportTemplates.find((template) => template.key === key);
}
