"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BoardHealthPanel } from "./BoardHealthPanel";
import { LockedButton, FeatureUpgradeModal } from "@/components/feature-gate";
import { useFeatureAccess } from "@/lib/hooks/useFeatureAccess";
import type { BoardHealthReport } from "@/lib/ai/types";
import { Sparkles } from "lucide-react";

interface BoardHealthButtonProps {
  boardId: string;
}

export function BoardHealthButton({ boardId }: BoardHealthButtonProps) {
  const { isAllowed } = useFeatureAccess();
  const canUseAI = isAllowed("aiFeatures");

  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<BoardHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/health-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate report");
      }
      setReport(data as BoardHealthReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setHasFetched(true);
      setLoading(false);
    }
  }

  function handleRegenerate() {
    setReport(null);
    setError(null);
    setHasFetched(false);
    fetchReport();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setReport(null);
      setError(null);
      setHasFetched(false);
      setLoading(false);
    }
  }

  return (
    <>
      {canUseAI ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          AI Insights
        </Button>
      ) : (
        <LockedButton
          label="AI Insights"
          requiredPlan="Enterprise"
          size="sm"
          onClick={() => setShowUpgrade(true)}
        />
      )}

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[480px] p-0 flex flex-col"
        >
          <SheetHeader className="px-5 py-4 border-b bg-gradient-to-r from-violet-600 to-indigo-600 shrink-0">
            <SheetTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Health Report
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <BoardHealthPanel
              report={report}
              loading={loading}
              error={error}
              hasFetched={hasFetched}
              onGenerate={fetchReport}
              onRegenerate={handleRegenerate}
            />
          </div>
        </SheetContent>
      </Sheet>

      <FeatureUpgradeModal
        feature={showUpgrade ? "aiFeatures" : null}
        onClose={() => setShowUpgrade(false)}
      />
    </>
  );
}
