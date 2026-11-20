"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, FileText, Globe2, MonitorSmartphone, RefreshCw, Target, UsersRound } from "lucide-react";
import { getPortalClientJson } from "../lib/portal-client-cache";

type RealtimeList = Array<{ label: string; value: number }>;

type RealtimeData = {
  capturedAt: string;
  activeUsers30Minutes: number;
  activeUsers5Minutes: number;
  activeUsersPerMinute: RealtimeList;
  countries: RealtimeList;
  cities: RealtimeList;
  pages: RealtimeList;
  events: RealtimeList;
  keyEvents: RealtimeList;
  audiences: RealtimeList;
  platforms: RealtimeList;
  devices: RealtimeList;
  warnings: string[];
};

function compact(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString();
}

function RealtimeListCard({ title, icon: Icon, items, valueLabel }: { title: string; icon: typeof Globe2; items: RealtimeList | undefined; valueLabel: string }) {
  const visibleItems = (items ?? []).slice(0, 5);
  return <section className="analytics-realtime-list-card"><div className="analytics-realtime-list-heading"><span><Icon size={14} /> {title}</span><small>{valueLabel}</small></div>{visibleItems.length ? <div className="analytics-realtime-list">{visibleItems.map((item) => <p key={`${title}-${item.label}`}><span title={item.label}>{item.label}</span><strong>{compact(item.value)}</strong></p>)}</div> : <p className="analytics-realtime-list-empty">No active data right now</p>}</section>;
}

function MinuteBars({ values }: { values: RealtimeList | undefined }) {
  const bars = values?.length ? values.slice(-18) : Array.from({ length: 18 }, () => ({ label: "", value: 0 }));
  const maximum = Math.max(...bars.map((item) => item.value), 1);
  return <div className="analytics-realtime-minute-bars" aria-label="Active users per minute">{bars.map((item, index) => <i key={`${item.label}-${index}`} title={item.label ? `${item.label} minutes ago: ${item.value}` : "No active users"} style={{ height: `${item.value ? Math.max(12, (item.value / maximum) * 100) : 4}%` }} />)}</div>;
}

export function AnalyticsRealtime({ hasHistoricalData = false, timeZone = "UTC" }: { hasHistoricalData?: boolean; timeZone?: string }) {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    try {
      const payload = await getPortalClientJson<{ status?: string; data?: RealtimeData | null }>("/api/portal/analytics/realtime", { ttlMs: 20_000, force, allowedStatuses: [409] });
      if (payload.status === "NOT_CONNECTED") {
        setData(null);
        setState("empty");
        return;
      }
      setData(payload.data ?? null);
      setState(payload.data ? "ready" : "empty");
      setLastUpdated(payload.data?.capturedAt ?? null);
    } catch {
      setData(null);
      setState("error");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [load]);

  const hasRealtimeActivity = Boolean(data && (data.activeUsers30Minutes > 0 || data.events.length > 0 || data.pages.length > 0));
  const stateLabel = state === "loading" ? "Loading from GA4" : state === "error" ? "Temporarily unavailable" : state === "empty" ? hasHistoricalData ? "Realtime unavailable" : "Connect GA4 to view realtime" : "Live from GA4";

  return <section className="analytics-reference-card analytics-realtime-panel" aria-label="Google Analytics realtime activity"><div className="analytics-realtime-panel-heading"><div><h2>Realtime activity</h2><p>Live visitors and events from the connected GA4 property.</p></div><span className={`analytics-realtime-status is-${state}`}><span /> {stateLabel}</span></div>{state === "loading" ? <div className="analytics-realtime-loading"><RefreshCw size={16} /> Loading the latest GA4 activity…</div> : state === "error" ? <div className="analytics-realtime-empty"><Activity size={18} /><div><strong>Realtime data is unavailable</strong><p>Try again after the next GA4 request window.</p></div><button type="button" onClick={() => void load(true)}><RefreshCw size={14} /> Retry</button></div> : state === "empty" ? <div className="analytics-realtime-empty"><Activity size={18} /><div><strong>No realtime report is available yet</strong><p>{hasHistoricalData ? "Historical GA4 rows remain available above. Live activity will appear after a GA4 property is connected and realtime access is available." : "Connect a GA4 property and publish the first reporting sync. A quiet website also appears here as an empty state, never as invented activity."}</p></div></div> : <><div className="analytics-realtime-summary"><div><span>ACTIVE USERS · 30 MINUTES</span><strong>{data?.activeUsers30Minutes.toLocaleString() ?? "0"}</strong></div><div><span>ACTIVE USERS · 5 MINUTES</span><strong>{data?.activeUsers5Minutes.toLocaleString() ?? "0"}</strong></div></div><div className="analytics-realtime-minute-heading"><span>ACTIVE USERS PER MINUTE</span><small>{lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone })}` : "Waiting for update"}</small></div><MinuteBars values={data?.activeUsersPerMinute} />{!hasRealtimeActivity ? <p className="analytics-realtime-no-activity">No active users or events in the current realtime window.</p> : null}<div className="analytics-realtime-lists"><RealtimeListCard title="Top countries" icon={Globe2} items={data?.countries} valueLabel="ACTIVE USERS" /><RealtimeListCard title="Top cities" icon={Globe2} items={data?.cities} valueLabel="ACTIVE USERS" /><RealtimeListCard title="Top pages" icon={FileText} items={data?.pages} valueLabel="VIEWS" /><RealtimeListCard title="Event count" icon={Activity} items={data?.events} valueLabel="EVENTS" /><RealtimeListCard title="Key events" icon={Target} items={data?.keyEvents} valueLabel="KEY EVENTS" /><RealtimeListCard title="Audiences" icon={UsersRound} items={data?.audiences} valueLabel="USERS" /><RealtimeListCard title="Platforms" icon={MonitorSmartphone} items={data?.platforms} valueLabel="USERS" /><RealtimeListCard title="Devices" icon={MonitorSmartphone} items={data?.devices} valueLabel="USERS" /></div>{data?.warnings.length ? <p className="analytics-realtime-warning">Some GA4 realtime breakdowns are not available for this property yet; unavailable panels remain empty.</p> : null}</>}</section>;
}
