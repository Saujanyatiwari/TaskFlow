// Stub — always permits. Replace body with Redis/Upstash logic when ready.
export async function checkRateLimit(
  _userId: string
): Promise<{ allowed: boolean }> {
  return { allowed: true };
}
