export const FREE_BOARD_LIMIT = 3;

export type Plan = "free" | "pro";

export function usePlanLimits(boardCount: number) {
  const plan: Plan = "free"; // future: read from Clerk publicMetadata

  const limit = plan === "free" ? FREE_BOARD_LIMIT : Infinity;
  const isAtLimit = boardCount >= limit;

  return {
    plan,
    limit,
    boardCount,
    isAtLimit,
  };
}
