import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";

export const MAX_REPORT_SIZE_BYTES = 25 * 1024 * 1024;

export class ReportStorageError extends Error {
  code: "INVALID_FILE" | "TOO_LARGE" | "NOT_CONFIGURED" | "NOT_FOUND";

  constructor(code: ReportStorageError["code"], message: string) {
    super(message);
    this.name = "ReportStorageError";
    this.code = code;
  }
}

export async function validateReportPdf(file: File) {
  if (!file || file.size === 0) throw new ReportStorageError("INVALID_FILE", "Choose a PDF file before uploading.");
  if (file.size > MAX_REPORT_SIZE_BYTES) throw new ReportStorageError("TOO_LARGE", "PDF files must be 25 MB or smaller.");
  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
    throw new ReportStorageError("INVALID_FILE", "Only PDF files are supported.");
  }

  const header = Buffer.from(await file.slice(0, 5).arrayBuffer()).toString("ascii");
  if (header !== "%PDF-") throw new ReportStorageError("INVALID_FILE", "The file signature is not a valid PDF.");
}

function localStorageRoot() {
  return path.join(process.cwd(), ".local-storage", "reports");
}

export async function storeReportPdf(file: File, reportId: string) {
  await validateReportPdf(file);
  const fileName = `${reportId}-${randomUUID()}.pdf`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`reports/${fileName}`, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/pdf",
    });
    return { storageKey: `blob:${blob.pathname}`, sizeBytes: file.size };
  }

  if (process.env.VERCEL === "1") {
    throw new ReportStorageError("NOT_CONFIGURED", "Production report storage is not configured. Add BLOB_READ_WRITE_TOKEN before uploading.");
  }

  await mkdir(localStorageRoot(), { recursive: true });
  await writeFile(path.join(localStorageRoot(), fileName), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  return { storageKey: `local:${fileName}`, sizeBytes: file.size };
}

export async function readStoredReport(storageKey: string) {
  if (storageKey.startsWith("blob:")) {
    const blob = await get(storageKey.slice(5), { access: "private", useCache: false });
    if (!blob || !blob.stream) throw new ReportStorageError("NOT_FOUND", "The stored PDF could not be found.");
    return { stream: blob.stream, sizeBytes: blob.blob.size, contentType: blob.blob.contentType || "application/pdf" };
  }

  if (storageKey.startsWith("local:")) {
    const fileName = path.basename(storageKey.slice(6));
    const filePath = path.join(localStorageRoot(), fileName);
    try {
      const data = await readFile(filePath);
      return { stream: new Blob([data], { type: "application/pdf" }).stream(), sizeBytes: data.byteLength, contentType: "application/pdf" };
    } catch {
      throw new ReportStorageError("NOT_FOUND", "The stored PDF could not be found.");
    }
  }

  throw new ReportStorageError("NOT_FOUND", "This report does not have a stored PDF.");
}

export async function deleteStoredReport(storageKey: string | null) {
  if (!storageKey?.startsWith("local:")) return;
  await unlink(path.join(localStorageRoot(), path.basename(storageKey.slice(6)))).catch(() => undefined);
}
