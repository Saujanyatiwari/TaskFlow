"use client";

import { useUser } from "@clerk/nextjs";

export const FREE_BOARD_LIMIT = 3;

export type Plan = "free" | "pro" | "enterprise";

const KNOWN_PLANS: Plan[] = ["free", "pro", "enterprise"];

export function usePlanLimits(boardCount: number) {
  const { user } = useUser();

  const rawPlan = user?.publicMetadata?.plan;
  const plan: Plan =
    typeof rawPlan === "string" && KNOWN_PLANS.includes(rawPlan as Plan)
      ? (rawPlan as Plan)
      : "free";

  const limit =
    plan === "free" ? FREE_BOARD_LIMIT : Infinity;

  const isAtLimit = limit === Infinity ? false : boardCount >= limit;
  const isUnlimited = limit === Infinity;

  return { plan, limit, boardCount, isAtLimit, isUnlimited };
}
