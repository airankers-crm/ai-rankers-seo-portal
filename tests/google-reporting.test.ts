import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGa4Metrics, fetchGa4Realtime, fetchGa4Trend, fetchGscMetrics, getGoogleSyncWindow } from "../lib/google/reporting";

afterEach(() => vi.unstubAllGlobals());

describe("Google reporting window", () => {
  it("covers the previous twelve complete calendar months", () => {
    const window = getGoogleSyncWindow(new Date("2026-11-17T16:00:00.000Z"));
    expect(window.start.toISOString()).toBe("2025-12-01T00:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-11-17T00:00:00.000Z");
  });
});

describe("Search Console reporting", () => {
  it("aggregates daily rows into monthly metric values", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ rows: [
      { keys: ["2026-01-03"], clicks: 4, impressions: 20, ctr: 0.2, position: 8 },
      { keys: ["2026-01-28"], clicks: 6, impressions: 30, ctr: 0.2, position: 4 },
      { keys: ["2026-02-02"], clicks: 2, impressions: 10, ctr: 0.2, position: 3 },
    ] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGscMetrics("token", "https://example.com/", {
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2026-03-01T00:00:00.000Z"),
    });

    expect(result.warnings).toEqual([]);
    expect(result.points.filter((point) => point.key === "gsc-clicks").map((point) => point.value)).toEqual([10, 2]);
    expect(result.points.filter((point) => point.key === "gsc-impressions").map((point) => point.value)).toEqual([50, 10]);
    expect(result.points.filter((point) => point.key === "gsc-ctr").map((point) => point.value)).toEqual([20, 20]);
    expect(result.points.filter((point) => point.key === "gsc-position").map((point) => point.value)).toEqual([5.6, 3]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("GA4 reporting", () => {
  it("publishes event count and engagement rate alongside the existing summary metrics", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { dimensions?: Array<{ name: string }>; metrics?: Array<{ name: string }> };
      const dimensions = body.dimensions?.map((dimension) => dimension.name) ?? [];
      if (dimensions.includes("sessionDefaultChannelGroup")) return new Response(JSON.stringify({ rows: [{ dimensionValues: [{ value: "202601" }, { value: "Organic Search" }], metricValues: [{ value: "8" }] }] }), { status: 200 });
      if (dimensions.includes("eventName")) return new Response(JSON.stringify({ rows: [{ dimensionValues: [{ value: "202601" }, { value: "phone_click" }], metricValues: [{ value: "3" }] }] }), { status: 200 });
      return new Response(JSON.stringify({ rows: [{ dimensionValues: [{ value: "202601" }], metricValues: [{ value: "10" }, { value: "20" }, { value: "49" }, { value: "5" }, { value: "127" }, { value: "2" }] }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGa4Metrics("token", "properties/123", { start: new Date("2026-01-01T00:00:00.000Z"), end: new Date("2026-03-01T00:00:00.000Z") });

    expect(result.points.find((point) => point.key === "ga4-event-count" && point.periodStart.toISOString() === "2026-01-01T00:00:00.000Z")?.value).toBe(127);
    expect(result.points.find((point) => point.key === "ga4-engagement-rate" && point.periodStart.toISOString() === "2026-01-01T00:00:00.000Z")?.value).toBe(0.25);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("maps realtime totals and dimensions without inventing rows", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { dimensions?: Array<{ name: string }>; metrics?: Array<{ name: string }> };
      const dimension = body.dimensions?.[0]?.name;
      if (!dimension) return new Response(JSON.stringify({ rows: [{ metricValues: [{ value: "10" }, { value: "2" }] }] }), { status: 200 });
      const label = dimension === "country" ? "United States" : dimension === "eventName" ? "page_view" : dimension === "minutesAgo" ? "1" : "Home";
      const metric = body.metrics?.[0]?.name === "screenPageViews" ? "4" : "3";
      return new Response(JSON.stringify({ rows: [{ dimensionValues: [{ value: label }], metricValues: [{ value: metric }] }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGa4Realtime("token", "properties/123");

    expect(result.activeUsers30Minutes).toBe(10);
    expect(result.activeUsers5Minutes).toBe(2);
    expect(result.countries).toEqual([{ label: "United States", value: 3 }]);
    expect(result.pages).toEqual([{ label: "Home", value: 4 }]);
    expect(result.devices).toEqual([{ label: "Home", value: 3 }]);
    expect(result.warnings).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("returns a daily trend and range summary for the Analytics chart", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { dimensions?: Array<{ name: string }> };
      if (body.dimensions?.[0]?.name === "date") return new Response(JSON.stringify({ rows: [{ dimensionValues: [{ value: "20261117" }], metricValues: [{ value: "10" }, { value: "12" }, { value: "20" }, { value: "1" }, { value: "49" }] }] }), { status: 200 });
      return new Response(JSON.stringify({ rows: [{ metricValues: [{ value: "10" }, { value: "12" }, { value: "20" }, { value: "1" }, { value: "49" }] }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGa4Trend("token", "properties/123", { start: new Date("2026-11-17T00:00:00.000Z"), end: new Date("2026-11-17T00:00:00.000Z") });

    expect(result.current.points).toEqual([{ date: "2026-11-17", activeUsers: 10, sessions: 12, eventCount: 20, keyEvents: 1, views: 49 }]);
    expect(result.current.summary).toEqual({ activeUsers: 10, sessions: 12, eventCount: 20, keyEvents: 1, views: 49 });
    expect(result.comparison).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
