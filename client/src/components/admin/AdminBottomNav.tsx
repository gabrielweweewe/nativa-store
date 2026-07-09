import { useAdminNotifications } from "@/contexts/AdminNotificationsContext";
import { LayoutDashboard, Package, ShoppingCart, Users } from "lucide-react";
import { Link, useLocation } from "wouter";

const primaryTabs = [
  {
    label: "Início",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    match: (path: string) => path === "/admin/dashboard" || path === "/admin",
  },
  {
    label: "Pedidos",
    href: "/admin/pedidos",
    icon: ShoppingCart,
    badgeKey: "new_order" as const,
    match: (path: string) => path.startsWith("/admin/pedidos"),
  },
  {
    label: "Clientes",
    href: "/admin/clientes",
    icon: Users,
    badgeKey: "new_customer" as const,
    match: (path: string) => path.startsWith("/admin/clientes"),
  },
  {
    label: "Produtos",
    href: "/admin/produtos",
    icon: Package,
    match: (path: string) => path.startsWith("/admin/produtos"),
  },
];

export default function AdminBottomNav() {
  const [location] = useLocation();
  const { unreadByType } = useAdminNotifications();

  return (
    <nav
      className="admin-bottom-nav fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Navegação principal"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {primaryTabs.map((tab) => {
          const isActive = tab.match(location);
          const Icon = tab.icon;
          const badgeCount = tab.badgeKey ? unreadByType[tab.badgeKey] : 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`admin-bottom-nav-link relative flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold transition-transform active:scale-95 ${
                isActive ? "admin-bottom-nav-link-active" : "admin-bottom-nav-link-inactive"
              }`}
            >
              <span className="relative">
                <span className={`admin-bottom-nav-icon-wrap ${isActive ? "" : "bg-transparent"}`}>
                  <Icon className={`size-[18px] ${isActive ? "stroke-[2.5px]" : ""}`} />
                </span>
                {badgeCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--admin-accent)] px-1 text-[9px] font-bold text-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
