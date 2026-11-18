"use client";

import { Download, FileUp, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

type PreviewRow = {
  line: number;
  metricKey: string;
  periodStart: string;
  periodEnd: string;
  value: string;
  source: string;
};

type ValidationError = {
  line: number;
  field: string;
  message: string;
};

type ImportResult = {
  line: number;
  metricKey: string;
  outcome: "created" | "updated" | "overridden" | "error";
  message?: string;
};

type ImportSummary = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  rows: ImportResult[];
};

type Phase = "idle" | "previewing" | "importing" | "done" | "error";

export function CsvImportPanel({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setFile(null);
    setPreview([]);
    setValidationErrors([]);
    setSummary(null);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFile = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setErrorMessage("Please select a .csv file.");
      setPhase("error");
      return;
    }

    setFile(selectedFile);
    setPhase("previewing");
    setErrorMessage("");
    setValidationErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`/api/admin/clients/${clientId}/import-csv?dry_run=1`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.validationErrors) {
          setValidationErrors(data.validationErrors);
          setErrorMessage(`${data.validationErrors.length} validation error${data.validationErrors.length !== 1 ? "s" : ""} found.`);
        } else {
          setErrorMessage(data.error ?? "Failed to validate the CSV file.");
        }
        setPhase("error");
        return;
      }

      setPreview(data.rows ?? []);
    } catch {
      setErrorMessage("Could not connect to the server.");
      setPhase("error");
    }
  }, [clientId]);

  const handleImport = useCallback(async () => {
    if (!file) return;
    setPhase("importing");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/admin/clients/${clientId}/import-csv`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error ?? "Import failed.");
        setPhase("error");
        return;
      }

      setSummary(data.summary);
      setPhase("done");
      router.refresh();
    } catch {
      setErrorMessage("Could not connect to the server.");
      setPhase("error");
    }
  }, [clientId, file, router]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) void handleFile(droppedFile);
  }, [handleFile]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <section id="csv-import" className="card panel csv-import-panel">
      <div className="panel-heading">
        <div>
          <h2>Import CSV metrics</h2>
          <p>Upload a CSV file to populate dashboard metric values for this client in bulk.</p>
        </div>
        <Upload size={18} color="#f26b38" />
      </div>

      {/* Template download */}
      <div className="csv-import-template">
        <a href={`/api/admin/clients/${clientId}/import-csv/template`} download className="button csv-import-download">
          <Download size={14} /> Download CSV template
        </a>
        <span className="csv-import-hint">Pre-filled with all 24 metric keys and the current month.</span>
      </div>

      {/* Upload area */}
      {phase === "idle" || phase === "error" ? (
        <>
          <div
            className={`csv-import-dropzone${isDragging ? " is-dragging" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <FileUp size={24} />
            <p>Drag a CSV file here, or <button type="button" className="csv-import-browse" onClick={() => fileInputRef.current?.click()}>browse</button></p>
            <span>Accepts .csv files up to 2 MB · max 500 rows per import</span>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { const selectedFile = event.target.files?.[0]; if (selectedFile) void handleFile(selectedFile); }} />
          </div>

          {errorMessage && (
            <div className="csv-import-error">
              <strong>{errorMessage}</strong>
              {validationErrors.length > 0 && (
                <ul>
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <li key={`${error.line}-${index}`}>Line {error.line}, {error.field}: {error.message}</li>
                  ))}
                  {validationErrors.length > 10 && <li>…and {validationErrors.length - 10} more</li>}
                </ul>
              )}
              <button type="button" className="button" onClick={reset}>Try again</button>
            </div>
          )}
        </>
      ) : null}

      {/* Preview table */}
      {phase === "previewing" && preview.length > 0 && (
        <div className="csv-import-preview">
          <div className="csv-import-preview-heading">
            <strong>{preview.length} row{preview.length !== 1 ? "s" : ""} ready to import</strong>
            <span>{file?.name}</span>
          </div>
          <div className="csv-import-table-wrap">
            <table className="csv-import-table">
              <thead>
                <tr>
                  <th>Metric key</th>
                  <th>Period</th>
                  <th>Value</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((row) => (
                  <tr key={`${row.line}-${row.metricKey}`}>
                    <td><code>{row.metricKey}</code></td>
                    <td>{row.periodStart} → {row.periodEnd}</td>
                    <td className="csv-import-value">{Number(row.value).toLocaleString()}</td>
                    <td><span className="csv-import-source-badge">{row.source}</span></td>
                  </tr>
                ))}
                {preview.length > 20 && (
                  <tr><td colSpan={4} className="csv-import-more">…and {preview.length - 20} more rows</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="csv-import-actions">
            <button type="button" className="button primary" onClick={handleImport}>
              <Upload size={14} /> Import {preview.length} row{preview.length !== 1 ? "s" : ""}
            </button>
            <button type="button" className="button" onClick={reset}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {phase === "previewing" && preview.length === 0 && (
        <div className="csv-import-loading">
          <Loader2 size={20} className="spin" />
          <p>Validating {file?.name ?? "CSV file"}…</p>
        </div>
      )}

      {/* Loading state */}
      {phase === "importing" && (
        <div className="csv-import-loading">
          <Loader2 size={20} className="spin" />
          <p>Importing {preview.length} metric value{preview.length !== 1 ? "s" : ""}…</p>
        </div>
      )}

      {/* Results */}
      {phase === "done" && summary && (
        <div className="csv-import-results">
          <div className="csv-import-summary-grid">
            <div className="csv-import-stat"><strong>{summary.created}</strong><span>Created</span></div>
            <div className="csv-import-stat"><strong>{summary.updated}</strong><span>Updated</span></div>
            <div className="csv-import-stat"><strong>{summary.skipped}</strong><span>Skipped</span></div>
            <div className="csv-import-stat"><strong>{summary.errors}</strong><span>Errors</span></div>
          </div>
          {summary.rows.filter((row) => row.outcome === "error").length > 0 && (
            <ul className="csv-import-error-list">
              {summary.rows.filter((row) => row.outcome === "error").map((row) => (
                <li key={row.line}>Line {row.line} ({row.metricKey}): {row.message}</li>
              ))}
            </ul>
          )}
          <button type="button" className="button" onClick={reset}>Import another file</button>
        </div>
      )}
    </section>
  );
}
