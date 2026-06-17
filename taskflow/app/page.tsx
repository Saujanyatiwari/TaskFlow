import Link from "next/link";
import {
  LayoutGrid,
  ListFilter,
  Sparkles,
  Infinity as InfinityIcon,
  BarChart2,
  Download,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { StartFreeButton, SignInLink } from "@/components/auth-buttons";

type FreeFeature = {
  iconBgClass: string;
  iconColorClass: string;
  Icon: LucideIcon;
  title: string;
  description: string;
};

type ProFeature = {
  Icon: LucideIcon;
  title: string;
  description: string;
};

const FREE_FEATURES: FreeFeature[] = [
  {
    iconBgClass: "bg-[#EEEDFE]",
    iconColorClass: "text-[#5A4A8B]",
    Icon: LayoutGrid,
    title: "Drag-and-drop boards",
    description:
      "Move tasks between columns with smooth, optimistic drag-and-drop. Free on every plan.",
  },
  {
    iconBgClass: "bg-[#FEF3C7]",
    iconColorClass: "text-amber-700",
    Icon: ListFilter,
    title: "Priority & filters",
    description:
      "Filter by priority, due date, or assignee. Active filter chips keep context visible.",
  },
  {
    iconBgClass: "bg-[#CCFBF1]",
    iconColorClass: "text-teal-700",
    Icon: Sparkles,
    title: "Free forever",
    description:
      "Real boards, real DnD, real filters — at no cost. Up to 3 boards, no card needed.",
  },
];

const PRO_FEATURES: ProFeature[] = [
  {
    Icon: InfinityIcon,
    title: "Unlimited boards",
    description: "No cap on boards. Create as many as your team needs, forever.",
  },
  {
    Icon: BarChart2,
    title: "Analytics dashboard",
    description:
      "Status breakdowns, priority trends, and activity timelines across all boards.",
  },
  {
    Icon: Download,
    title: "CSV export",
    description:
      "Download your board or a filtered view as a clean CSV. One click.",
  },
];

function KanbanPreview() {
  return (
    <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.08)] p-5 shadow-lg">
      {/* Board header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgba(0,0,0,0.06)]">
        <div className="w-3 h-3 rounded-full bg-[#5A4A8B]" />
        <span className="text-sm font-semibold text-[#1A1A18]">Q3 Launch</span>
        <span className="ml-auto text-[11px] text-[#6B6B68] bg-[#F5F0E8] rounded-full px-2 py-0.5">
          5 tasks
        </span>
      </div>
      {/* Columns */}
      <div className="flex gap-3">
        {/* To Do */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-[#6B6B68]" />
            <span className="text-[11px] font-bold text-[#6B6B68] uppercase tracking-wide">
              To Do
            </span>
          </div>
          <div className="space-y-2">
            <div className="bg-[#F5F0E8] rounded-[10px] p-2.5">
              <p className="text-[12px] font-medium text-[#1A1A18] mb-2">
                Design homepage
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-[#FEE2E2] text-red-700 rounded-full px-2 py-0.5 font-medium">
                  High
                </span>
                <div className="w-5 h-5 rounded-full bg-[#EEEDFE] text-[9px] flex items-center justify-center text-[#5A4A8B] font-bold">
                  S
                </div>
              </div>
            </div>
            <div className="bg-[#F5F0E8] rounded-[10px] p-2.5">
              <p className="text-[12px] font-medium text-[#1A1A18] mb-2">
                Write landing copy
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-[#FEF3C7] text-amber-700 rounded-full px-2 py-0.5 font-medium">
                  Med
                </span>
                <div className="w-5 h-5 rounded-full bg-[#CCFBF1] text-[9px] flex items-center justify-center text-teal-700 font-bold">
                  A
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-[#5A4A8B]" />
            <span className="text-[11px] font-bold text-[#5A4A8B] uppercase tracking-wide">
              In Progress
            </span>
          </div>
          <div className="space-y-2">
            <div className="bg-[#F5F0E8] rounded-[10px] p-2.5 border border-[rgba(90,74,139,0.2)]">
              <p className="text-[12px] font-medium text-[#1A1A18] mb-2">
                Build auth flow
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-[#FEE2E2] text-red-700 rounded-full px-2 py-0.5 font-medium">
                  High
                </span>
                <div className="w-5 h-5 rounded-full bg-[#EEEDFE] text-[9px] flex items-center justify-center text-[#5A4A8B] font-bold">
                  S
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Done */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span className="text-[11px] font-bold text-[#22C55E] uppercase tracking-wide">
              Done
            </span>
          </div>
          <div className="space-y-2">
            <div className="bg-[#F5F0E8] rounded-[10px] p-2.5">
              <p className="text-[12px] font-medium text-[#1A1A18] mb-2">
                Setup database
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-[#CCFBF1] text-teal-700 rounded-full px-2 py-0.5 font-medium">
                  Low
                </span>
                <div className="w-5 h-5 rounded-full bg-[#CCFBF1] text-[9px] flex items-center justify-center text-teal-700 font-bold">
                  A
                </div>
              </div>
            </div>
            <div className="bg-[#F5F0E8] rounded-[10px] p-2.5">
              <p className="text-[12px] font-medium text-[#1A1A18] mb-2">
                Deploy to prod
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-[#FEF3C7] text-amber-700 rounded-full px-2 py-0.5 font-medium">
                  Med
                </span>
                <div className="w-5 h-5 rounded-full bg-[#EEEDFE] text-[9px] flex items-center justify-center text-[#5A4A8B] font-bold">
                  S
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* ── Navbar ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 h-14 flex items-center justify-between px-5 sm:px-8 bg-[rgba(245,240,232,0.9)] backdrop-blur-md border-b border-[rgba(0,0,0,0.08)]">
        <span className="text-[17px] font-semibold text-[#1A1A18]">TaskFlow</span>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6">
          <a
            href="#features"
            className="text-sm text-[#6B6B68] hover:text-[#1A1A18] transition-colors"
          >
            Features
          </a>
          <Link
            href="/pricing"
            className="text-sm text-[#6B6B68] hover:text-[#1A1A18] transition-colors"
          >
            Pricing
          </Link>
          {!isSignedIn && (
            <>
              <SignInLink />
              <Link
                href="/sign-up"
                className="text-sm bg-[#5A4A8B] text-white rounded-[20px] px-4 py-[7px] hover:bg-[#4A3A7B] transition-colors font-medium"
              >
                Sign up
              </Link>
            </>
          )}
          {isSignedIn && (
            <Link
              href="/dashboard"
              className="text-sm bg-[#5A4A8B] text-white rounded-[20px] px-4 py-[7px] hover:bg-[#4A3A7B] transition-colors font-medium"
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* Mobile hamburger — visual only */}
        <button
          type="button"
          className="sm:hidden flex items-center justify-center w-11 h-11 text-[#1A1A18]"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-14 sm:pt-[5.5rem] pb-12 sm:pb-20 px-5 sm:px-8">
        <div className="max-w-[600px] mx-auto text-center lg:max-w-6xl lg:flex lg:items-center lg:gap-16 lg:text-left">

          {/* Left — text content */}
          <div className="lg:flex-1">
            {/* Eyebrow pill */}
            <div className="inline-flex items-center gap-[6px] bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] px-[14px] py-[5px] text-xs font-medium text-[#6B6B68] mb-6">
              <span className="w-[7px] h-[7px] rounded-full bg-[#22C55E] shrink-0" />
              Free to start, no credit card needed
            </div>

            {/* H1 */}
            <h1 className="text-[34px] sm:text-[48px] font-bold tracking-[-1px] sm:tracking-[-1.5px] leading-[1.1] mb-5">
              <span className="block text-[#1A1A18]">Your team&apos;s work,</span>
              <span className="block text-[#5A4A8B]">finally in order</span>
            </h1>

            {/* Subtext */}
            <p className="text-[15px] sm:text-[17px] text-[#6B6B68] leading-[1.65] max-w-[440px] mx-auto mb-10 lg:mx-0">
              TaskFlow turns scattered tasks into clear, moving boards. Drag, drop,
              filter, and ship — without the complexity of tools built for teams of
              thousands.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center bg-[#5A4A8B] text-white rounded-[24px] px-[30px] py-[14px] text-[15px] font-semibold hover:bg-[#4A3A7B] transition-colors min-h-11"
                >
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <StartFreeButton className="w-full sm:w-auto" />
                  <Link
                    href="/pricing"
                    className="w-full sm:w-auto inline-flex items-center justify-center bg-white text-[#1A1A18] border border-[rgba(0,0,0,0.08)] rounded-[24px] px-[30px] py-[14px] text-[15px] font-semibold hover:bg-[#EDE9E0] transition-colors min-h-11"
                  >
                    See pricing →
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right — kanban preview (desktop only) */}
          <div className="hidden lg:block lg:flex-1">
            <KanbanPreview />
          </div>

        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-12 sm:py-20 px-5 sm:px-8">
        <div className="max-w-[720px] mx-auto text-center lg:max-w-6xl">
          {/* Section header */}
          <p className="text-xs font-bold text-[#5A4A8B] uppercase tracking-[0.8px] mb-2">
            Features
          </p>
          <h2 className="text-[24px] sm:text-[32px] font-bold tracking-[-0.8px] leading-[1.2] text-[#1A1A18] mb-[0.875rem]">
            Everything a focused team needs
          </h2>
          <p className="text-[16px] text-[#6B6B68] max-w-[480px] mx-auto mb-10">
            The basics are free on every plan. Upgrade to Pro when your team needs
            more room to grow.
          </p>

          {/* Free features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {FREE_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[16px] p-5 text-left"
              >
                <div
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center mb-[0.875rem] ${feature.iconBgClass}`}
                >
                  <feature.Icon className={`w-4 h-4 ${feature.iconColorClass}`} />
                </div>
                <p className="text-sm font-semibold text-[#1A1A18] mb-1">
                  {feature.title}
                </p>
                <p className="text-[13px] text-[#6B6B68] leading-[1.55]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Pro divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
            <span className="text-[11px] font-bold text-[#5A4A8B] uppercase tracking-[0.8px] bg-[#EEEDFE] border border-[rgba(90,74,139,0.2)] rounded-[20px] px-3 py-[3px] whitespace-nowrap max-w-[80%] text-center">
              What you get with Pro
            </span>
            <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
          </div>

          {/* Pro features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRO_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-[#EEEDFE] border border-[rgba(90,74,139,0.2)] rounded-[16px] p-5 text-left"
              >
                <div className="w-9 h-9 rounded-[10px] bg-[rgba(90,74,139,0.15)] flex items-center justify-center mb-[0.875rem]">
                  <feature.Icon className="w-4 h-4 text-[#5A4A8B]" />
                </div>
                <p className="text-sm font-semibold text-[#1A1A18] mb-1">
                  {feature.title}
                </p>
                <p className="text-[13px] text-[#6B6B68] leading-[1.55]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="mt-16 bg-[#EDE9E0] border-t border-[rgba(0,0,0,0.08)] py-8 px-8 text-center">
        <p className="text-[15px] font-semibold text-[#1A1A18] mb-[0.4rem]">TaskFlow</p>
        <p className="text-[13px] text-[#6B6B68]">
          © 2026 TaskFlow. Built with Next.js &amp; Supabase.
        </p>
      </footer>
    </div>
  );
}
