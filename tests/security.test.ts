import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "../lib/security/origin";
import { parseSafeHttpUrl } from "../lib/security/urls";

describe("security boundaries", () => {
  it("accepts normal web URLs and rejects executable or credential-bearing URLs", () => {
    expect(parseSafeHttpUrl("https://docs.example.com/report.pdf")).toBe("https://docs.example.com/report.pdf");
    expect(parseSafeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(parseSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(parseSafeHttpUrl("https://user:password@example.com/report.pdf")).toBeNull();
  });

  it("requires a same-origin browser signal for mutations", () => {
    expect(isSameOriginRequest(new Request("https://portal.example.com/api/tasks", { method: "POST", headers: { Origin: "https://portal.example.com" } }))).toBe(true);
    expect(isSameOriginRequest(new Request("https://portal.example.com/api/tasks", { method: "POST", headers: { Origin: "https://evil.example" } }))).toBe(false);
    expect(isSameOriginRequest(new Request("https://portal.example.com/api/tasks", { method: "POST" }))).toBe(false);
  });
});
