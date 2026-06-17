"use client";

import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Dialog as RadixDialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, X, Zap } from "lucide-react";
import Link from "next/link";
import { FeatureName, featureLabels, featureRequiredPlan } from "@/lib/config/featureMatrix";

/* ── Tooltip-style locked button ─────────────────────────────────────────── */

interface LockedButtonProps {
  label: string;
  requiredPlan: string;
  onClick: () => void;
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "ghost" | "default";
  className?: string;
}

export function LockedButton({
  label,
  requiredPlan,
  onClick,
  size = "default",
  variant = "outline",
  className = "",
}: LockedButtonProps) {
  return (
    <div className={`relative group inline-flex ${className}`}>
      <Button variant={variant} size={size} onClick={onClick} className="opacity-60">
        <Lock className="h-3.5 w-3.5 mr-1.5 shrink-0" />
        {label}
      </Button>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        Available in {requiredPlan}+
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

/* ── Locked feature card (for dashboard teaser section) ──────────────────── */

interface LockedFeatureCardProps {
  feature: FeatureName;
  icon: React.ReactNode;
  description: string;
  onUnlock: (feature: FeatureName) => void;
}

export function LockedFeatureCard({
  feature,
  icon,
  description,
  onUnlock,
}: LockedFeatureCardProps) {
  const required = featureRequiredPlan[feature];
  const label = featureLabels[feature];

  const isPro = required === "Pro";

  const palette = isPro
    ? {
        card:   "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100",
        icon:   "bg-blue-100 text-blue-600",
        badge:  "bg-blue-100 text-blue-700",
        button: "border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300",
      }
    : {
        card:   "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100",
        icon:   "bg-purple-100 text-purple-600",
        badge:  "bg-purple-100 text-purple-700",
        button: "border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300",
      };

  return (
    <div className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${palette.card}`}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${palette.icon}`}>
          {icon}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${palette.badge}`}>
          <Lock className="h-3 w-3" />
          {required}
        </span>
      </div>

      {/* Text */}
      <h4 className="text-sm font-semibold text-gray-800 mb-1">{label}</h4>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">{description}</p>

      {/* CTA */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onUnlock(feature)}
        className={`w-full text-xs font-semibold bg-white ${palette.button}`}
      >
        <Zap className="h-3 w-3 mr-1.5" />
        Upgrade to unlock
      </Button>
    </div>
  );
}

/* ── Feature upgrade modal ───────────────────────────────────────────────── */

interface FeatureUpgradeModalProps {
  feature: FeatureName | null;
  onClose: () => void;
}

export function FeatureUpgradeModal({ feature, onClose }: FeatureUpgradeModalProps) {
  if (!feature) return null;

  // aiFeatures is enterprise-only and enterprise is not a public tier —
  // nothing to show users; close silently.
  if (feature === "aiFeatures") return null;

  const required = featureRequiredPlan[feature];
  const label = featureLabels[feature];

  return (
    <Dialog open={!!feature} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="!bg-black/40 backdrop-blur-sm" />
        <RadixDialog.Content className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none bg-white rounded-2xl shadow-xl border border-[#EDE9E0] p-6 w-full max-w-sm mx-auto text-center">
          <DialogClose className="absolute top-4 right-4 text-[#9C9890] hover:text-[#1A1816] transition-colors">
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="w-12 h-12 rounded-full bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-5 h-5 text-[#5A4A8B]" />
          </div>
          <DialogTitle className="text-[18px] font-semibold text-[#1A1816] mb-2">{label} is locked</DialogTitle>
          <p className="text-[13px] text-[#9C9890] leading-relaxed mb-5">
            This feature requires the <strong>{required}</strong> plan or higher.
          </p>
          <Link
            href="/pricing"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            View Plans
          </Link>
          <button onClick={onClose} className="w-full mt-3 px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#5A5753] bg-[#F5F0E8] hover:bg-[#EDE9E0] border border-[#EDE9E0] transition-colors block text-center">
            Maybe Later
          </button>
        </RadixDialog.Content>
      </DialogPortal>
    </Dialog>
  );
}
