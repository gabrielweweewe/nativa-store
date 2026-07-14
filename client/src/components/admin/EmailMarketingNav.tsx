import { cn } from "@/lib/utils";
import { ContactRound, List, MailCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

const items = [
  {
    label: "Campanhas",
    href: "/admin/email-marketing/campanhas",
    icon: MailCheck,
  },
  {
    label: "Listas",
    href: "/admin/email-marketing/listas",
    icon: List,
  },
  {
    label: "Contatos",
    href: "/admin/email-marketing/contatos",
    icon: ContactRound,
  },
];

export default function EmailMarketingNav() {
  const [location] = useLocation();

  return (
    <nav
      aria-label="Seções de Email Marketing"
      className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-1"
    >
      {items.map(item => {
        const active = location.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-[var(--admin-accent)] text-white"
                : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-hover)]"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
