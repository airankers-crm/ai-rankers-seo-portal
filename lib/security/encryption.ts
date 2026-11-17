import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const VERSION = "v1";

function encryptionKey() {
  const encoded = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("INTEGRATION_ENCRYPTION_KEY is required for Google integration secrets.");

  const key = Buffer.from(encoded, "base64");
  if (key.length !== KEY_LENGTH) throw new Error("INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptSecret(value: string) {
  if (!value) throw new Error("Cannot encrypt an empty secret.");

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string) {
  const [version, encodedIv, encodedTag, encodedCiphertext] = payload.split(".");
  if (version !== VERSION || !encodedIv || !encodedTag || !encodedCiphertext) throw new Error("Invalid encrypted secret payload.");

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function hashOpaqueValue(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}
