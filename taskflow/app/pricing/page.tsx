"use client";

import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlanLimits } from "@/lib/hooks/usePlanLimits";
import { useUser } from "@clerk/nextjs";
import { Check, Zap, Building2 } from "lucide-react";
import Link from "next/link";

const FREE_FEATURES = [
  "Up to 3 boards",
  "4 columns per board",
  "Unlimited tasks",
  "Drag & drop kanban",
  "Priority & date filtering",
  "Task search",
  "Due date tracking",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Up to 20 boards",
  "Team collaboration",
  "Advanced analytics",
  "Custom column templates",
  "Export to CSV",
  "Priority support",
];

const ENTERPRISE_FEATURES = [
  "Everything in Pro",
  "Unlimited boards",
  "Unlimited workspaces",
  "Custom integrations",
  "Dedicated account manager",
  "SSO / SAML support",
  "SLA & uptime guarantee",
];

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const { plan } = usePlanLimits(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Start free. Upgrade when you need more. No hidden fees.
          </p>
          {plan === "enterprise" && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-medium text-purple-700">
              <Building2 className="h-4 w-4" />
              You are on the Enterprise plan
            </div>
          )}
          {plan === "pro" && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-4 py-1.5 text-sm font-medium text-yellow-700">
              <Zap className="h-4 w-4" />
              You are on the Pro plan
            </div>
          )}
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">

          {/* Free Plan */}
          <Card className={plan === "free" ? "ring-2 ring-blue-500" : ""}>
            <CardHeader className="pb-4">
              <div className="mb-3 h-6">
                {plan === "free" && (
                  <Badge className="bg-blue-500 text-white text-xs">Current Plan</Badge>
                )}
              </div>
              <CardTitle className="text-xl">Free</CardTitle>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500 mb-1">/month</span>
              </div>
              <p className="text-sm text-gray-500">Perfect for personal projects</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              {isSignedIn ? (
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/sign-up">
                  <Button variant="outline" className="w-full">
                    Get Started Free
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={`bg-gray-900 text-white border-gray-800 ${plan === "pro" ? "ring-2 ring-yellow-400" : ""}`}>
            <CardHeader className="pb-4">
              <div className="mb-3 h-6">
                {plan === "pro" ? (
                  <Badge className="bg-yellow-400 text-black text-xs">Current Plan</Badge>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 text-xs font-semibold text-white">
                    <Zap className="h-3 w-3" /> Most Popular
                  </span>
                )}
              </div>
              <CardTitle className="text-xl text-white">Pro</CardTitle>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-bold text-white">$9</span>
                <span className="text-gray-400 mb-1">/month</span>
              </div>
              <p className="text-sm text-gray-400">For power users and growing teams</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="h-4 w-4 text-yellow-400 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan === "pro" ? (
                <Button disabled className="w-full bg-yellow-400 text-black font-semibold opacity-80">
                  <Zap className="h-4 w-4 mr-2" />
                  Current Plan
                </Button>
              ) : (
                <Button className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-semibold">
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to Pro — Coming Soon
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className={`bg-gradient-to-b from-purple-900 to-indigo-900 text-white border-purple-700 ${plan === "enterprise" ? "ring-2 ring-purple-400" : ""}`}>
            <CardHeader className="pb-4">
              <div className="mb-3 h-6">
                {plan === "enterprise" ? (
                  <Badge className="bg-purple-400 text-white text-xs">Current Plan</Badge>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/40 border border-purple-400/50 px-3 py-1 text-xs font-semibold text-purple-200">
                    <Building2 className="h-3 w-3" /> For Teams
                  </span>
                )}
              </div>
              <CardTitle className="text-xl text-white">Enterprise</CardTitle>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-bold text-white">Custom</span>
              </div>
              <p className="text-sm text-purple-300">For teams and organizations</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {ENTERPRISE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-purple-100">
                    <Check className="h-4 w-4 text-purple-300 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan === "enterprise" ? (
                <Button disabled className="w-full bg-purple-400 text-white font-semibold opacity-80">
                  <Building2 className="h-4 w-4 mr-2" />
                  Current Plan
                </Button>
              ) : (
                <Button className="w-full bg-purple-500 hover:bg-purple-400 text-white font-semibold border border-purple-400">
                  <Building2 className="h-4 w-4 mr-2" />
                  Contact Sales
                </Button>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Footer note */}
        <div className="mt-12 text-center text-sm text-gray-500 space-y-1">
          <p>All plans include SSL security, automatic backups, and 99.9% uptime SLA.</p>
          <p>
            Questions?{" "}
            <a href="mailto:support@taskflow.app" className="underline hover:text-gray-700">
              Contact support
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
