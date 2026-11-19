import { describe, expect, it } from "vitest";
import { CLIENT_SETUP_STEPS, getClientSetupStep } from "../components/client-setup-wizard";

describe("client setup wizard navigation", () => {
  it("removes Analytics and GBP from the guided stepper while keeping direct source routes valid", () => {
    expect(CLIENT_SETUP_STEPS.map((step) => step.id)).toEqual([
      "details",
      "business",
      "website",
      "sections",
      "review",
      "publish",
      "invite",
    ]);
    expect(getClientSetupStep("analytics")).toBe("analytics");
    expect(getClientSetupStep("gbp")).toBe("gbp");
  });
});
