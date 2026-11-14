import { createHash, timingSafeEqual } from "node:crypto";
import { parseSafeHttpUrl } from "./security/urls";

type UnknownRecord = Record<string, unknown>;

export type NormalizedMetformLead = {
  sourceEventId: string | null;
  formId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  service: string | null;
  message: string | null;
  pageUrl: string | null;
  submittedAt: Date;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asText(value: unknown, maxLength: number) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

function fieldKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function flattenedPayload(body: UnknownRecord) {
  const nested = [body.data, body.fields, body.formData].find(isRecord);
  return nested ? { ...body, ...nested } : body;
}

function findField(body: UnknownRecord, names: string[]) {
  const fields = new Map(Object.entries(body).map(([key, value]) => [fieldKey(key), value]));
  for (const name of names) {
    const exact = fields.get(fieldKey(name));
    const value = asText(exact, 5000);
    if (value) return value;
  }

  for (const [key, rawValue] of fields) {
    if (names.some((name) => key.includes(fieldKey(name)))) {
      const value = asText(rawValue, 5000);
      if (value) return value;
    }
  }

  return null;
}

function parseSubmittedAt(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function normalizeMetformLead(input: unknown, headers?: Headers): NormalizedMetformLead | { error: string } {
  if (!isRecord(input)) return { error: "The webhook body must be a JSON object." };
  const body = flattenedPayload(input);
  const name = findField(body, ["name", "fullName", "full_name", "yourName", "your-name", "contactName"]);
  const phone = findField(body, ["phone", "number", "mobile", "telephone", "yourPhone", "your-phone"]);
  const email = findField(body, ["email", "emailAddress", "email_address", "yourEmail", "your-email"]);
  const service = findField(body, ["service", "serviceRequested", "service_requested", "serviceType", "subject"]);
  const message = findField(body, ["message", "details", "description", "yourMessage", "your-message"]);
  const pageUrlValue = findField(body, ["pageUrl", "page_url", "sourceUrl", "source_url", "url"]);
  const submittedAt = parseSubmittedAt(body.submittedAt ?? body.submitted_at ?? body.timestamp);
  const formId = asText(body.formId ?? body.form_id ?? headers?.get("x-metform-form-id"), 80);
  const sourceEventId = asText(body.eventId ?? body.event_id ?? body.entryId ?? body.entry_id ?? body.id ?? headers?.get("x-metform-entry-id"), 120);

  if (!name) return { error: "A lead name is required." };
  if (!phone && !email) return { error: "A lead phone number or email address is required." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "The lead email address is invalid." };

  return {
    sourceEventId,
    formId,
    name: name.slice(0, 160),
    phone: phone?.slice(0, 80) ?? null,
    email: email?.slice(0, 320).toLowerCase() ?? null,
    service: service?.slice(0, 200) ?? null,
    message: message?.slice(0, 5000) ?? null,
    pageUrl: pageUrlValue ? parseSafeHttpUrl(pageUrlValue) : null,
    submittedAt,
  };
}

export function hasWebhookSecret(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function fallbackEventId(clientId: string, payload: NormalizedMetformLead) {
  if (payload.sourceEventId) return payload.sourceEventId;
  return `payload-${createHash("sha256").update(JSON.stringify({ clientId, ...payload, submittedAt: payload.submittedAt.toISOString() })).digest("hex").slice(0, 32)}`;
}
