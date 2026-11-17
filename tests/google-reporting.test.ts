import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGscMetrics, getGoogleSyncWindow } from "../lib/google/reporting";

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
      { keys: ["2026-01-03"], clicks: 4, impressions: 20 },
      { keys: ["2026-01-28"], clicks: 6, impressions: 30 },
      { keys: ["2026-02-02"], clicks: 2, impressions: 10 },
    ] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGscMetrics("token", "https://example.com/", {
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2026-03-01T00:00:00.000Z"),
    });

    expect(result.warnings).toEqual([]);
    expect(result.points.filter((point) => point.key === "gsc-clicks").map((point) => point.value)).toEqual([10, 2]);
    expect(result.points.filter((point) => point.key === "gsc-impressions").map((point) => point.value)).toEqual([50, 10]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
