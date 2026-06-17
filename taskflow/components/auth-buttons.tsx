import Link from "next/link";

export function StartFreeButton({ className }: { className?: string }) {
  return (
    <Link
      href="/sign-up"
      className={`bg-[#5A4A8B] text-white rounded-[24px] px-[30px] py-[14px] text-[15px] font-semibold hover:bg-[#4A3A7B] transition-colors min-h-11 cursor-pointer inline-flex items-center justify-center${className ? ` ${className}` : ""}`}
    >
      Start for free
    </Link>
  );
}

export function SignInLink() {
  return (
    <Link
      href="/sign-in"
      className="text-sm text-[#6B6B68] hover:text-[#1A1A18] transition-colors cursor-pointer font-normal leading-none"
    >
      Sign in
    </Link>
  );
}
