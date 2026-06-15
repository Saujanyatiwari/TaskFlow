"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportSection } from "./ReportSection";
import type { BoardHealthReport } from "@/lib/ai/types";
import { AlertCircle, RefreshCw, Copy, Check, Sparkles } from "lucide-react";

const statusConfig = {
  "On Track":        { dot: "bg-emerald-500", text: "text-emerald-700", card: "bg-emerald-50 border-emerald-200" },
  "Needs Attention": { dot: "bg-amber-500",   text: "text-amber-700",   card: "bg-amber-50 border-amber-200"   },
  "At Risk":         { dot: "bg-orange-500",  text: "text-orange-700",  card: "bg-orange-50 border-orange-200" },
  "Critical":        { dot: "bg-red-500",     text: "text-red-700",     card: "bg-red-50 border-red-200"       },
} as const;

function formatRelativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function toMarkdown(report: BoardHealthReport): string {
  const section = (
    heading: string,
    items: string[],
    empty: string
  ): string[] => [
    `## ${heading}`,
    ...(items.length > 0 ? items : [empty]),
    "",
  ];

  return [
    "# AI Health Report",
    "",
    `**Status:** ${report.projectStatus.label} (${report.projectStatus.score}/100)`,
    report.projectStatus.summary,
    "",
    "## Summary",
    report.projectSummary,
    "",
    ...section(
      "Risks",
      report.risks.map((r) => `- **${r.title}** [${r.severity}]: ${r.description}`),
      "_None identified._"
    ),
    ...section(
      "Bottlenecks",
      report.bottlenecks.map((b) => `- **${b.title}**: ${b.description}`),
      "_None identified._"
    ),
    ...section(
      "Recommendations",
      report.recommendations.map((r) => `- **${r.title}** [${r.priority}]: ${r.description}`),
      "_None._"
    ),
    ...section(
      "Next Actions",
      report.nextActions.map((a) => `- ${a.action}${a.owner ? ` (${a.owner})` : ""} [${a.urgency}]`),
      "_None._"
    ),
    "---",
    `Generated ${formatRelativeTime(report.generatedAt)} · ${report.provider} ${report.model} · prompt ${report.promptVersion}`,
  ].join("\n");
}

interface BoardHealthPanelProps {
  report: BoardHealthReport | null;
  loading: boolean;
  error: string | null;
  hasFetched: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
}

export function BoardHealthPanel({
  report,
  loading,
  error,
  hasFetched,
  onGenerate,
  onRegenerate,
}: BoardHealthPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(toMarkdown(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — ignore silently
    }
  }

  if (!hasFetched && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">AI Project Health Report</p>
          <p className="text-xs text-gray-500 mt-1">
            Analyze risks, bottlenecks, and get actionable recommendations.
          </p>
        </div>
        <Button
          onClick={onGenerate}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-5 space-y-5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Report failed</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (!report) return null;

  const cfg = statusConfig[report.projectStatus.label];
  if (!cfg) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 flex-wrap">
          <span className="capitalize">{report.provider}</span>
          <span>·</span>
          <span>{report.model}</span>
          <span>·</span>
          <span>prompt {report.promptVersion}</span>
          <span>·</span>
          <span>{formatRelativeTime(report.generatedAt)}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy}>
            {copied
              ? <><Check className="h-3 w-3 mr-1 text-emerald-500" />Copied!</>
              : <><Copy className="h-3 w-3 mr-1" />Copy</>
            }
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRegenerate}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Regenerate
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className={`rounded-xl border p-4 ${cfg.card}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
              <span className={`text-sm font-bold ${cfg.text}`}>{report.projectStatus.label}</span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.card} ${cfg.text}`}>
              {report.projectStatus.score}/100
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{report.projectStatus.summary}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Summary</h3>
          <p className="text-xs text-gray-600 leading-relaxed">{report.projectSummary}</p>
        </div>

        <ReportSection title="Risks"           items={report.risks}           emptyMessage="No significant risks identified." />
        <ReportSection title="Bottlenecks"     items={report.bottlenecks}     emptyMessage="No bottlenecks identified." />
        <ReportSection title="Recommendations" items={report.recommendations} emptyMessage="No specific recommendations." />
        <ReportSection title="Next Actions"    items={report.nextActions}     emptyMessage="No immediate actions required." />
      </div>
    </div>
  );
}
