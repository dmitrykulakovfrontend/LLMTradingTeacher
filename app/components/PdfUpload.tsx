"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface PdfUploadProps {
  onAnalyze: (pdfText: string, prompt: string) => void;
  loading: boolean;
}

interface PdfFile {
  name: string;
  totalPages: number;
  extractedPages: number;
  text: string;
}

// Lazy-load pdfjs-dist in the browser
let pdfjsPromise: Promise<{
  getDocument: (src: { data: ArrayBuffer }) => {
    promise: Promise<PDFDocumentProxy>;
  };
  GlobalWorkerOptions: { workerSrc: string };
}> | null = null;

function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url,
      ).toString();
      return mod;
    });
  }
  return pdfjsPromise;
}

async function getPageCount(file: File): Promise<number> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const count = doc.numPages;
  await doc.destroy();
  return count;
}

async function extractText(
  file: File,
  startPage: number,
  endPage: number,
): Promise<{ text: string; extractedPages: number; totalPages: number }> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];

  const start = Math.max(1, startPage);
  const end = Math.min(endPage, doc.numPages);

  for (let i = start; i <= end; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item) => "str" in item)
      .map((item) => (item as { str: string }).str)
      .join(" ");
    pageTexts.push(`[Page ${i}]\n${text}`);
  }

  await doc.destroy();
  return {
    text: pageTexts.join("\n\n"),
    extractedPages: end - start + 1,
    totalPages: doc.numPages,
  };
}

const DEFAULT_PDF_PROMPT = `You are a skeptical financial analyst reviewing SEC filings for a beginner investor. Your job is to extract key information, spot red flags, and explain everything in plain language.

## DOCUMENT TYPE DETECTION
First, identify what you're looking at:
- S-1/S-1A: IPO prospectus (company going public)
- 10-K: Annual report
- 10-Q: Quarterly report
- 8-K: Material event disclosure

## EXTRACTION TASKS

### 1. Company Snapshot
- Company name and ticker (if any)
- What do they actually DO? (1-2 sentences, no marketing fluff)
- Founded when? Going public when?
- Number of employees
- Headquarters location

### 2. Financial Health (find these numbers)
- Revenue (current and previous year)
- Net income/loss
- Cash on hand
- Total debt
- Cash burn rate (if losing money: how many months until broke?)

### 3. Red Flag Scan
Look for and highlight:
- "Unaudited" — who audited? Big 4 or unknown firm?
- "Going concern" — auditor doubts they'll survive
- "Related party transactions" — paying themselves or friends
- "Material weakness" — accounting problems
- "Pro forma" or "Non-GAAP" — adjusted numbers (what are they hiding?)
- Lawsuits or SEC investigations mentioned
- Key person dependency ("if our CEO dies, we're screwed")
- Customer concentration ("80% of revenue from 1 customer")

### 4. Ownership & Dilution
- Who owns how much before IPO?
- How much will public own after IPO?
- Any weird share structures (dual class, supervoting)?
- Insider lockup period?

### 5. Use of Proceeds
- How much are they raising?
- What will they spend it on? (Be specific, not "general corporate purposes")

### 6. Risk Ranking
From the Risk Factors section, identify:
- TOP 3 SCARY RISKS (company-specific, actually concerning)
- IGNORE generic legal boilerplate every company has

## OUTPUT FORMAT

**VERDICT: 🟢 Interesting / 🟡 Proceed with caution / 🔴 Major red flags**

Then provide:
1. One paragraph summary a beginner can understand
2. The extracted data in sections above
3. "Questions I'd want answered before investing"

## IMPORTANT RULES
- If data is missing, say "NOT FOUND" — never guess
- If numbers are unaudited, always note it
- Be skeptical but fair — not every risk is a dealbreaker
- Explain jargon when you use it
- Compare to benchmarks when possible ("typical SaaS gross margin is 70-80%, this company has 45%")`;

function formatTokens(chars: number): string {
  const tokens = Math.ceil(chars / 4);
  if (tokens >= 1000) return `~${(tokens / 1000).toFixed(1)}k tokens`;
  return `~${tokens} tokens`;
}

export default function PdfUpload({ onAnalyze, loading }: PdfUploadProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [pdf, setPdf] = useState<PdfFile | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [pageStart, setPageStart] = useState(1);
  const [pageEnd, setPageEnd] = useState(1);
  const [prompt, setPrompt] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pdf-prompt") ?? DEFAULT_PDF_PROMPT;
    }
    return DEFAULT_PDF_PROMPT;
  });
  const [savedPrompt, setSavedPrompt] = useState(prompt);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

  // Preload pdfjs when the panel is opened
  useEffect(() => {
    if (!collapsed) getPdfjs();
  }, [collapsed]);

  const handleFile = useCallback(async (file: File) => {
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file.");
      return;
    }
    if (file.size > 11 * 1024 * 1024) {
      setError("File too large (max 10 MB).");
      return;
    }

    setError(null);
    setParsing(true);
    setPdf(null);
    setTotalPages(null);
    fileRef.current = file;

    try {
      const pages = await getPageCount(file);
      setTotalPages(pages);
      setPageStart(1);
      setPageEnd(pages);
      const result = await extractText(file, 1, pages);
      setPdf({
        name: file.name,
        totalPages: result.totalPages,
        extractedPages: result.extractedPages,
        text: result.text,
      });
    } catch {
      setError("Failed to parse PDF");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleReExtract = useCallback(async () => {
    const file = fileRef.current;
    if (!file) return;

    setError(null);
    setParsing(true);
    setPdf(null);

    try {
      const result = await extractText(file, pageStart, pageEnd);
      setPdf({
        name: file.name,
        totalPages: result.totalPages,
        extractedPages: result.extractedPages,
        text: result.text,
      });
    } catch {
      setError("Failed to parse PDF");
    } finally {
      setParsing(false);
    }
  }, [pageStart, pageEnd]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleClear = useCallback(() => {
    setPdf(null);
    setTotalPages(null);
    fileRef.current = null;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdf || !prompt.trim() || loading) return;
    onAnalyze(pdf.text, prompt.trim());
  };

  const estimatedTokens = pdf ? Math.ceil(pdf.text.length / 4) : 0;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors rounded-lg"
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          PDF Analysis
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {!collapsed && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3">
          {/* Drop zone / file picker */}
          {!pdf && !parsing && !totalPages && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed cursor-pointer py-6 px-3 text-center transition-colors ${
                dragOver
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
              }`}
            >
              <svg
                className="w-8 h-8 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Drop a PDF here or click to browse
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Max 10 MB
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {/* Parsing state */}
          {parsing && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500 dark:text-gray-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Extracting text...
            </div>
          )}

          {/* Loaded file info */}
          {pdf && (
            <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
              <svg
                className="w-4 h-4 shrink-0 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="truncate text-gray-800 dark:text-gray-200">
                  {pdf.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {pdf.extractedPages === pdf.totalPages
                    ? `${pdf.totalPages} page${pdf.totalPages !== 1 ? "s" : ""}`
                    : `${pdf.extractedPages} of ${pdf.totalPages} pages`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Page range selector */}
          {pdf && totalPages && totalPages > 1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm flex-wrap">
                <span className="text-gray-500 dark:text-gray-400 shrink-0">Pages</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageStart}
                  onChange={(e) => setPageStart(Math.max(1, Math.min(+e.target.value, totalPages)))}
                  className="w-14 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-1 text-xs text-gray-900 dark:text-gray-100 text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-400 dark:text-gray-500">-</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageEnd}
                  onChange={(e) => setPageEnd(Math.max(1, Math.min(+e.target.value, totalPages)))}
                  className="w-14 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-1 text-xs text-gray-900 dark:text-gray-100 text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">of {totalPages}</span>
              </div>
              {(pageStart !== 1 || pageEnd !== totalPages) && (
                <button
                  type="button"
                  onClick={handleReExtract}
                  disabled={parsing || pageStart > pageEnd}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Re-extract pages {pageStart}-{pageEnd}
                </button>
              )}
            </div>
          )}

          {/* Token estimation */}
          {pdf && (
            <div className={`text-xs ${estimatedTokens > 100000 ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"}`}>
              {formatTokens(pdf.text.length)}
              {estimatedTokens > 100000 && " — large document, consider narrowing page range"}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Prompt — collapsible, system-prompt style */}
          {pdf && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
                <button
                  type="button"
                  onClick={() => setPromptExpanded(!promptExpanded)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <span>Prompt{prompt !== savedPrompt ? " *" : ""}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${promptExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {promptExpanded && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={12}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem("pdf-prompt", prompt);
                            setSavedPrompt(prompt);
                          }}
                          disabled={prompt === savedPrompt || !prompt.trim()}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPrompt(DEFAULT_PDF_PROMPT);
                            setSavedPrompt(DEFAULT_PDF_PROMPT);
                            localStorage.removeItem("pdf-prompt");
                          }}
                          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                      {prompt !== savedPrompt && (
                        <span className="text-xs text-amber-500">Unsaved</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  "Analyze PDF"
                )}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
