export const FREE_BOARD_LIMIT = 3;
export const PRO_BOARD_LIMIT = 20;

export type Plan = "free" | "pro" | "enterprise";

export function usePlanLimits(boardCount: number) {
  const plan = "free" as Plan; // future: read from Clerk publicMetadata

  const limit =
    plan === "free" ? FREE_BOARD_LIMIT :
    plan === "pro"  ? PRO_BOARD_LIMIT  :
    Infinity;

  const isAtLimit = limit === Infinity ? false : boardCount >= limit;

  const isUnlimited = limit === Infinity;

  return { plan, limit, boardCount, isAtLimit, isUnlimited };
}
