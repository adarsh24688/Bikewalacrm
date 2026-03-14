"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function PrintTrigger() {
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  function handleCopyLink() {
    const url = window.location.href.replace(/[?&]print=1/, "");
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-slate-500 hidden sm:block">Quotation Preview</p>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
