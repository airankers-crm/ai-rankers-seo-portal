import { describe, expect, it } from "vitest";
import { fallbackEventId, hasWebhookSecret, normalizeMetformLead } from "../lib/metform";

describe("MetForm lead boundary", () => {
  it("normalizes common WordPress form field names", () => {
    const result = normalizeMetformLead({
      full_name: "Test Customer",
      phone: "555-555-0100",
      email: "TEST@example.com",
      service_requested: "AC repair",
      message: "Synthetic test submission",
      page_url: "https://mckoyhvac.theairankers.net/contact-us/",
      entry_id: "entry-123",
    });

    expect(result).toEqual({
      sourceEventId: "entry-123",
      formId: null,
      name: "Test Customer",
      phone: "555-555-0100",
      email: "test@example.com",
      service: "AC repair",
      message: "Synthetic test submission",
      pageUrl: "https://mckoyhvac.theairankers.net/contact-us/",
      submittedAt: expect.any(Date),
    });
  });

  it("requires a name and at least one contact method", () => {
    expect(normalizeMetformLead({ email: "person@example.com" })).toEqual({ error: "A lead name is required." });
    expect(normalizeMetformLead({ name: "Test Customer" })).toEqual({ error: "A lead phone number or email address is required." });
  });

  it("compares webhook secrets without accepting a missing value", () => {
    expect(hasWebhookSecret("secret", "secret")).toBe(true);
    expect(hasWebhookSecret("wrong", "secret")).toBe(false);
    expect(hasWebhookSecret(null, "secret")).toBe(false);
    expect(fallbackEventId("client-1", { sourceEventId: "entry-123", formId: null, name: "Test", phone: null, email: "person@example.com", service: null, message: null, pageUrl: null, submittedAt: new Date("2026-11-13T00:00:00.000Z") })).toBe("entry-123");
  });
});
