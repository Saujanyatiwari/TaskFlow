"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const appearance = {
  variables: {
    colorPrimary: "#5A4A8B",
    colorBackground: "#FFFFFF",
    colorText: "#1A1A18",
    colorTextSecondary: "#6B6B68",
    colorInputBackground: "#F5F0E8",
    colorInputText: "#1A1A18",
    borderRadius: "12px",
    fontFamily: "inherit",
  },
  elements: {
    card: "shadow-none border border-[rgba(0,0,0,0.08)] rounded-[16px]",
    headerTitle: "text-[#1A1A18] font-bold",
    headerSubtitle: "text-[#6B6B68]",
    formButtonPrimary:
      "bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors rounded-[24px] text-[15px] font-semibold shadow-none",
    formFieldInput:
      "border border-[rgba(0,0,0,0.12)] rounded-[10px] bg-[#F5F0E8] text-[#1A1A18] focus:border-[#5A4A8B] focus:ring-1 focus:ring-[#5A4A8B]",
    formFieldLabel: "text-[#1A1A18] text-sm font-medium",
    footerActionLink: "text-[#5A4A8B] hover:text-[#4A3A7B] font-medium",
    dividerLine: "bg-[rgba(0,0,0,0.08)]",
    dividerText: "text-[#6B6B68] text-xs",
    identityPreviewText: "text-[#1A1A18]",
    identityPreviewEditButton: "text-[#5A4A8B]",
    alertText: "text-[#1A1A18]",
    socialButtonsIconButton:
      "border border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#F5F0E8] transition-colors rounded-[10px]",
    socialButtonsBlockButton:
      "border border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#F5F0E8] transition-colors rounded-[10px] text-[#1A1A18]",
  },
};

export default function SignUpPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[22px] font-bold text-[#1A1A18] mb-2">Welcome to TaskFlow</p>
          <p className="text-sm text-[#6B6B68] mb-6">Taking you to your dashboard...</p>
          <div className="w-6 h-6 border-2 border-[#5A4A8B] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="text-[22px] font-bold text-[#1A1A18] hover:text-[#5A4A8B] transition-colors"
          >
            TaskFlow
          </Link>
        </div>

        <SignUp appearance={appearance} />
      </div>
    </div>
  );
}
