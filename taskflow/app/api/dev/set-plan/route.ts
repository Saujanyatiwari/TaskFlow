import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// DEV-ONLY route — sets the current user's plan in Clerk publicMetadata.
// Usage: GET /api/dev/set-plan?plan=enterprise
// Delete this file before deploying to production.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const plan = req.nextUrl.searchParams.get("plan") ?? "enterprise";
  const validPlans = ["free", "pro", "enterprise"];
  if (!validPlans.includes(plan)) {
    return NextResponse.json({ error: `Invalid plan. Use: ${validPlans.join(", ")}` }, { status: 400 });
  }

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: { plan },
  });

  return NextResponse.json({ ok: true, userId, plan });
}
