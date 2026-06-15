import { auth } from "@clerk/nextjs/server";

const KNOWN_PLANS = ["free", "pro", "enterprise"] as const;
type KnownPlan = (typeof KNOWN_PLANS)[number];

const PLAN_RANK: Record<KnownPlan, number> = { free: 0, pro: 1, enterprise: 2 };

function normalizePlan(raw: unknown): KnownPlan {
  if (typeof raw === "string" && (KNOWN_PLANS as readonly string[]).includes(raw)) {
    return raw as KnownPlan;
  }
  return "free";
}

type PlanCheckSuccess = {
  ok: true;
  userId: string;
  plan: KnownPlan;
  getToken: () => Promise<string | null>;
};

type PlanCheckFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
};

export type PlanCheckResult = PlanCheckSuccess | PlanCheckFailure;

export async function checkPlanAccess(
  requiredPlan: "pro" | "enterprise"
): Promise<PlanCheckResult> {
  const { userId, sessionClaims, getToken } = await auth();

  if (!userId) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  const plan = normalizePlan(metadata?.plan);

  if (PLAN_RANK[plan] < PLAN_RANK[requiredPlan]) {
    const label = requiredPlan === "enterprise" ? "Enterprise" : "Pro";
    return {
      ok: false,
      status: 403,
      error: `This feature requires a ${label} plan`,
    };
  }

  return { ok: true, userId, plan, getToken };
}
