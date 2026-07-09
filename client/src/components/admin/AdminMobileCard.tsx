import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "wouter";

interface AdminMobileCardProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export default function AdminMobileCard({ href, children, className = "" }: AdminMobileCardProps) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-2xl border border-[#E8D5C4] bg-white p-4 shadow-sm transition-all active:scale-[0.99] active:bg-[#FAF7F2] ${className}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronRight className="size-4 shrink-0 text-[#8B6F5E]/60 transition-transform group-active:translate-x-0.5" />
    </Link>
  );
}

export function AdminMobileList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 p-3 lg:hidden">{children}</div>;
}

export function AdminDesktopTable({ children }: { children: ReactNode }) {
  return <div className="hidden lg:block">{children}</div>;
}
