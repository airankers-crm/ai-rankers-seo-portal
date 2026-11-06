"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Search, Sparkles, TrendingUp } from "lucide-react";
import type { DemoMetric } from "@ai-rankers/core";
import { formatChange, formatMetricValue, getPeriodValues, type RankingPeriod } from "./ranked-visibility-list.logic";

export type VisibilityMetric = DemoMetric & {
  displayLabel: string;
  detail: string;
  format: "integer" | "compact";
  priority: number;
};

export function RankedVisibilityList({ metrics, latestPeriodLabel = "Latest month", quarterLabel = "Trailing quarter" }: { metrics: VisibilityMetric[]; latestPeriodLabel?: string; quarterLabel?: string }) {
  const [period, setPeriod] = useState<RankingPeriod>("month");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rows = metrics
    .toSorted((left, right) => left.priority - right.priority)
    .map((metric, index) => {
      const values = getPeriodValues(metric.history, metric.value, period);
      return { metric, ...values, change: formatChange(values.current, values.previous), rank: index + 1 };
    });
  const positiveMovements = rows.filter((row) => row.change.direction === "positive").length;

  return (
    <section className="card ranked-visibility-panel" aria-labelledby="ranked-visibility-title">
      <div className="ranked-visibility-heading">
        <div>
          <p className="eyebrow">AI visibility / Ranking signals</p>
          <h2 id="ranked-visibility-title">Visibility signals</h2>
          <p>Priority signals ranked with source-aware movement and period comparisons.</p>
        </div>
        <div className="ranked-period-switch" role="group" aria-label="Ranking period">
          <button type="button" className={period === "month" ? "active" : ""} aria-pressed={period === "month"} onClick={() => { setPeriod("month"); setExpandedId(null); }}>Month</button>
          <button type="button" className={period === "quarter" ? "active" : ""} aria-pressed={period === "quarter"} onClick={() => { setPeriod("quarter"); setExpandedId(null); }}>Quarter</button>
        </div>
      </div>

      <div className="ranked-visibility-summary">
        <div><span>Tracked signals</span><strong>{rows.length}</strong></div>
        <div><span>Positive movement</span><strong>{positiveMovements} / {rows.length}</strong></div>
        <div><span>Period</span><strong>{period === "month" ? latestPeriodLabel : quarterLabel}</strong></div>
      </div>

      {rows.length === 0 ? (
        <div className="ranked-visibility-empty"><Search size={16} /><div><strong>No visibility data yet</strong><p>Connect a rank source or publish a metric value to populate this panel.</p></div></div>
      ) : (
        <div className="ranked-visibility-list">
          {rows.map(({ metric, current, previous, comparisonAvailable, change, rank }) => {
            const expanded = expandedId === metric.id;
            const isPositive = change.direction === "positive";
            return (
              <div className="ranked-visibility-row-group" key={metric.id}>
                <button type="button" className={`ranked-visibility-row ${expanded ? "expanded" : ""}`} onClick={() => setExpandedId(expanded ? null : metric.id)} aria-expanded={expanded} aria-controls={`visibility-detail-${metric.id}`}>
                  <span className="ranked-visibility-position">{String(rank).padStart(2, "0")}</span>
                  <span className={`ranked-visibility-icon ${rank === 1 ? "orange" : rank === 2 ? "teal" : "blue"}`}>
                    {rank === 1 ? <Sparkles size={15} /> : rank === 2 ? <TrendingUp size={15} /> : <Search size={15} />}
                  </span>
                  <span className="ranked-visibility-copy"><strong>{metric.displayLabel}</strong><small>{metric.detail} · {metric.source}</small></span>
                  <span className="ranked-visibility-value"><strong>{formatMetricValue(current, metric.format)}</strong><small>{period === "month" ? "current value" : "quarter total"}</small></span>
                  <span className={`ranked-visibility-change ${change.direction}`}>{isPositive ? <ArrowUpRight size={13} /> : change.direction === "negative" ? <ArrowDownRight size={13} /> : null} {change.label}</span>
                  <ChevronRight className={`ranked-visibility-arrow ${expanded ? "expanded" : ""}`} size={16} />
                </button>
                {expanded ? <div className="ranked-visibility-detail" id={`visibility-detail-${metric.id}`}><span><strong>Source</strong>{metric.source}</span><span><strong>Comparison</strong>{comparisonAvailable ? `${formatMetricValue(previous ?? 0, metric.format)} previous period` : "Not enough history"}</span><span><strong>Interpretation</strong>{comparisonAvailable ? (change.direction === "positive" ? "Moving in a positive direction" : change.direction === "negative" ? "Needs review this period" : "Stable versus the previous period") : "Collect another complete period to calculate movement"}</span></div> : null}
              </div>
            );
          })}
        </div>
      )}
      <p className="ranked-visibility-note">Rows are ordered by configured visibility priority. Only metrics supplied for this workspace are shown.</p>
    </section>
  );
}
