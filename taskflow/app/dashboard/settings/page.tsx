"use client";

import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
  CheckSquare,
  BarChart2,
  Settings,
  Plus,
  Lock,
  LogOut,
  Sparkles,
  User,
  Bell,
  Shield,
  Palette,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { useBoards } from "@/lib/hooks/useBoards";
import { usePlanLimits } from "@/lib/hooks/usePlanLimits";
import { FeatureName } from "@/lib/config/featureMatrix";
import { FeatureUpgradeModal } from "@/components/feature-gate";

export default function SettingsPage() {
  const { user } = useUser();
  const clerk = useClerk();
  const { signOut } = clerk;
  const { boards } = useBoards();
  const { plan, limit, isUnlimited } = usePlanLimits(boards.length);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<FeatureName | null>(null);

  const initials = user
    ? user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user.emailAddresses[0]?.emailAddress ?? "U").slice(0, 2).toUpperCase()
    : "U";

  const navItems = [
    { id: "Overview",  icon: LayoutDashboard, label: "Overview",    href: "/dashboard",           locked: false },
    { id: "Tasks",     icon: CheckSquare,     label: "Tasks",       href: "/dashboard/tasks",     locked: false },
    { id: "Analytics", icon: BarChart2,       label: "Analytics",   href: "/dashboard/analytics", locked: plan === "free" },
    { id: "Settings",  icon: Settings,        label: "Settings",    href: "/dashboard/settings",  locked: false },
  ];

  const settingsSections = [
    {
      icon: User,
      title: "Profile",
      description: "Manage your name, email, and avatar",
      action: "Manage profile",
      onClick: () => clerk.openUserProfile(),
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Email and in-app notification preferences",
      action: "Coming soon",
      onClick: null,
    },
    {
      icon: Palette,
      title: "Appearance",
      description: "Theme and display preferences",
      action: "Coming soon",
      onClick: null,
    },
    {
      icon: Shield,
      title: "Security",
      description: "Password, two-factor authentication, and active sessions",
      action: "Coming soon",
      onClick: null,
    },
  ];

  const sidebarInner = (
    <>
      {/* Logo + toggle */}
      <div className={`flex items-center px-5 pt-6 pb-6 ${isCollapsed ? "md:justify-center md:px-0" : "justify-between"}`}>
        <span className={`text-2xl font-semibold text-[#1A1816] ${isCollapsed ? "md:hidden" : ""}`}>TaskFlow</span>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-[#7A7872] hover:text-[#1A1816] hover:bg-[#F0EBE2] transition-colors shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden p-1 text-[#7A7872] hover:text-[#1A1816] transition-colors"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      <nav className="flex flex-col">
        {navItems.map(({ id, icon: Icon, label, href, locked }) => (
          <Link
            key={id}
            href={locked ? "#" : href}
            title={isCollapsed ? label : undefined}
            onClick={(e) => {
              if (locked) {
                e.preventDefault();
                if (id === "Analytics") setLockedFeature("analytics");
              }
              setSidebarOpen(false);
            }}
            className={`flex items-center w-full transition-colors text-lg
              ${isCollapsed ? "gap-3 px-5 py-2.5 md:justify-center md:py-3 md:px-0 md:gap-0" : "gap-3 px-5 py-2.5"}
              ${id === "Settings" ? "font-medium text-[#1A1816]" : "text-[#7A7872] hover:text-[#1A1816]"}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={`flex-1 text-left ${isCollapsed ? "md:hidden" : ""}`}>{label}</span>
            {locked && <Lock className={`h-3 w-3 text-[#B0ADA6] ${isCollapsed ? "md:hidden" : ""}`} />}
          </Link>
        ))}
      </nav>

      <div className={`px-5 pt-5 pb-2 text-md font-bold tracking-normal uppercase text-[#B0ADA6] ${isCollapsed ? "md:hidden" : ""}`}>
        Boards
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        <div className={isCollapsed ? "md:hidden" : ""}>
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/dashboard?board=${board.id}`}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-5 py-2 text-base text-[#7A7872] hover:text-[#1A1816] transition-colors"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${board.color}`} />
              <span className="truncate text-left">{board.title}</span>
            </Link>
          ))}
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 px-5 py-2 text-base font-semibold text-[#7F77DD] hover:text-[#6960C4] transition-colors"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>New board</span>
          </Link>
        </div>
      </div>

      <button
        onClick={() => signOut({ redirectUrl: "/" })}
        className={`flex items-center w-full text-sm text-[#7A7872] hover:text-[#1A1816] transition-colors border-t border-[#F0EBE2]
          ${isCollapsed ? "gap-3 px-5 py-3 md:justify-center md:px-0 md:gap-0" : "gap-3 px-5 py-3"}`}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span className={isCollapsed ? "md:hidden" : ""}>Log out</span>
      </button>

      <div className={`border-t border-[#F0EBE2] ${isCollapsed ? "md:py-4" : "px-5 pt-4 pb-5"}`}>
        {/* Collapsed desktop — avatar only */}
        <div className={`justify-center ${isCollapsed ? "hidden md:flex" : "hidden"}`}>
          <div className="w-8 h-8 rounded-full bg-[#7F77DD] text-white flex items-center justify-center text-sm font-medium shrink-0">
            {initials}
          </div>
        </div>
        {/* Expanded — full footer */}
        <div className={isCollapsed ? "md:hidden px-5 pt-4 pb-5 -mx-0" : ""}>
          {plan === "free" ? (
            <>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-[#7A7872] mb-1.5">
                  <span>Boards</span>
                  <span>{boards.length}/{isUnlimited ? "∞" : limit}</span>
                </div>
                <div className="h-1.5 bg-[#F0EBE2] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7F77DD] rounded-full transition-all duration-300"
                    style={{
                      width: `${isUnlimited ? 0 : Math.min(100, (boards.length / (limit as number)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <Link
                href="/pricing"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#7F77DD] hover:bg-[#6960C4] text-white text-sm font-medium transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade to Pro
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#7F77DD] text-white flex items-center justify-center text-sm font-medium shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1816] truncate leading-tight">
                  {user?.fullName ?? user?.emailAddresses[0]?.emailAddress}
                </p>
                <span className="inline-flex items-center text-[10px] font-semibold bg-[#E8E6FC] text-[#4A46A8] px-2 py-0.5 rounded-full mt-0.5">
                  Pro plan
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

    </>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 md:hidden transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="flex h-screen overflow-hidden">
        {/* ── Sidebar ── */}
        <aside
          className={`flex flex-col bg-white border-r border-[#F0EBE2] h-full
            fixed md:relative inset-y-0 left-0
            z-50 md:z-auto flex-shrink-0
            shadow-xl md:shadow-none
            overflow-hidden
            transition-[width,transform] duration-200
            w-[280px] ${isCollapsed ? "md:w-16" : "md:w-[280px]"}
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        >
          {sidebarInner}
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 overflow-y-auto bg-[#F0EDE6]">
          <div className="px-4 py-5 md:px-8 md:py-8">
            {/* Mobile header row */}
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="md:hidden shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-start"
              >
                <Menu className="h-5 w-5 text-[#1A1816]" />
              </button>
              <div className="md:mb-8">
                <h1 className="text-[18px] md:text-[22px] font-bold text-[#1A1A18] mb-0.5 md:mb-1">Settings</h1>
                <p className="text-[13px] md:text-[14px] text-[#6B6B68]">Manage your account and preferences</p>
              </div>
            </div>

            {/* Plan badge */}
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 md:p-5 mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#1A1A18]">Current plan</p>
                <p className="text-[12px] md:text-[13px] text-[#6B6B68] mt-0.5 capitalize">
                  {plan} plan · {isUnlimited ? "Unlimited boards" : `${boards.length} / ${limit} boards`}
                </p>
              </div>
              {plan === "free" ? (
                <Link
                  href="/pricing"
                  className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Upgrade
                </Link>
              ) : (
                <span className="inline-flex items-center text-[11px] font-semibold bg-[#E8E6FC] text-[#4A46A8] px-3 py-1 rounded-full shrink-0">
                  Pro
                </span>
              )}
            </div>

            {/* Settings cards */}
            <div className="flex flex-col gap-3">
              {settingsSections.map(({ icon: Icon, title, description, action, onClick }) => (
                <div
                  key={title}
                  className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 md:p-5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-[10px] bg-[#F0EDE6] flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-[#5A4A8B]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#1A1A18]">{title}</p>
                      <p className="text-[11px] md:text-[12px] text-[#6B6B68] mt-0.5 leading-snug">{description}</p>
                    </div>
                  </div>
                  {onClick ? (
                    <button
                      onClick={onClick}
                      className="text-[12px] font-medium text-[#5A4A8B] hover:text-[#4A3A7B] shrink-0 ml-2 transition-colors"
                    >
                      {action} →
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-[#B0ADA6] bg-[#F5F0E8] px-2.5 py-1 rounded-full shrink-0 ml-2">
                      {action}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <FeatureUpgradeModal feature={lockedFeature} onClose={() => setLockedFeature(null)} />
    </>
  );
}
