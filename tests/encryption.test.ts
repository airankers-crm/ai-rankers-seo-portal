import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, hashOpaqueValue } from "../lib/security/encryption";

const originalKey = process.env.INTEGRATION_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY;
  else process.env.INTEGRATION_ENCRYPTION_KEY = originalKey;
});

describe("integration secret encryption", () => {
  it("round-trips AES-256-GCM secrets without exposing plaintext", () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const encrypted = encryptSecret("refresh-token-value");

    expect(encrypted).not.toContain("refresh-token-value");
    expect(decryptSecret(encrypted)).toBe("refresh-token-value");
  });

  it("creates stable opaque hashes for OAuth state lookup", () => {
    expect(hashOpaqueValue("state")).toBe(hashOpaqueValue("state"));
    expect(hashOpaqueValue("state")).not.toBe(hashOpaqueValue("other-state"));
  });
});
