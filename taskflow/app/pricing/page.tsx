"use client";

import { usePlanLimits } from "@/lib/hooks/usePlanLimits";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";

const FREE_FEATURES = [
  "3 boards",
  "Drag & drop",
  "Filters & search",
  "Basic kanban",
];

const PRO_FEATURES = [
  "Unlimited boards",
  "Analytics dashboard",
  "CSV export",
  "Priority support",
];

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const { plan } = usePlanLimits(0);

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-[#F5F0E8] flex flex-col">

      {/* Navbar */}
      <div className="w-full bg-[#F5F0E8] px-8 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-[17px] font-semibold text-[#1A1816]">TaskFlow</span>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors flex items-center gap-1.5"
          >
            Go to Dashboard
            <ArrowRight className="w-[14px] h-[14px]" />
          </Link>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">

        <h1 className="text-[26px] font-semibold text-[#1A1816] text-center tracking-tight mb-1">
          Simple, transparent pricing
        </h1>
        <p className="text-[13.5px] text-[#9C9890] text-center mb-8">
          Start free. Upgrade when you need more. No hidden fees.
        </p>

        {/* Plan Cards */}
        <div className="flex gap-5 items-stretch w-full max-w-2xl">

          {/* Free Plan */}
          <div className="flex-1 bg-white rounded-2xl border-2 border-[#C0B3E1] p-6 flex flex-col">
            {plan === "free" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EEEDFE] text-[#5A4A8B] text-[11px] font-semibold mb-3">
                Current Plan
              </span>
            )}
            <p className="text-[22px] font-semibold text-[#1A1816] mb-1">Free</p>
            <div className="flex items-end mb-1">
              <span className="text-[32px] font-bold text-[#1A1816]">$0</span>
              <span className="text-[13px] text-[#9C9890] ml-1">/month</span>
            </div>
            <p className="text-[12.5px] text-[#9C9890] mb-4">Perfect for personal projects</p>
            <ul>
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-[13px] text-[#5A5753] mb-2">
                  <Check className="w-[14px] h-[14px] text-[#A9C2AA] shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-auto" />
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="w-full py-2.5 rounded-xl text-[13px] font-medium text-[#5A5753] bg-[#F5F0E8] hover:bg-[#EDE9E0] border border-[#EDE9E0] transition-colors text-center mt-4 block"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/sign-up"
                className="w-full py-2.5 rounded-xl text-[13px] font-medium text-[#5A5753] bg-[#F5F0E8] hover:bg-[#EDE9E0] border border-[#EDE9E0] transition-colors text-center mt-4 block"
              >
                Get Started Free
              </Link>
            )}
          </div>

          {/* Pro Plan */}
          <div className="flex-1 bg-[#1A1816] rounded-2xl p-6 flex flex-col">
            {plan === "pro" ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EEEDFE] text-[#5A4A8B] text-[11px] font-semibold mb-3">
                Current Plan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5A4A8B] text-white text-[11px] font-semibold mb-3">
                <Sparkles className="w-3 h-3" /> Most Popular
              </span>
            )}
            <p className="text-[22px] font-semibold text-white mb-1">Pro</p>
            <div className="flex items-end mb-1">
              <span className="text-[32px] font-bold text-white">$9</span>
              <span className="text-[13px] text-[#9C9890] ml-1">/month</span>
            </div>
            <p className="text-[12.5px] text-[#9C9890] mb-4">For power users and growing teams</p>
            <ul>
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-[13px] text-white mb-2">
                  <Check className="w-[14px] h-[14px] text-[#A9C2AA] shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-auto" />
            {plan === "pro" ? (
              <button
                disabled
                className="w-full py-2.5 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] opacity-70 text-center mt-4 flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Sparkles className="w-[14px] h-[14px]" />
                Current Plan
              </button>
            ) : (
              <button
                className="w-full py-2.5 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors text-center mt-4 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-[14px] h-[14px]" />
                Upgrade to Pro — Coming Soon
              </button>
            )}
          </div>

        </div>

        {/* Footer note */}
        <div className="text-[12px] text-[#B0ADA6] text-center mt-6 space-y-1">
          <p>All plans include SSL security, automatic backups, and 99.9% uptime SLA.</p>
          <p>
            Questions?{" "}
            <a href="mailto:support@taskflow.app" className="underline hover:text-[#5A5753]">
              Contact support
            </a>
          </p>
        </div>

      </main>
    </div>
  );
}
