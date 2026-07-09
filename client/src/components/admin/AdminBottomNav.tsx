import { useAdminNotifications } from "@/contexts/AdminNotificationsContext";
import { Package, ShoppingCart, Upload, Users } from "lucide-react";
import { Link, useLocation } from "wouter";

const primaryTabs = [
  { label: "Produtos", href: "/admin/produtos", icon: Package, match: (path: string) => path.startsWith("/admin/produtos") },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingCart, badgeKey: "new_order" as const, match: (path: string) => path.startsWith("/admin/pedidos") },
  { label: "Clientes", href: "/admin/clientes", icon: Users, badgeKey: "new_customer" as const, match: (path: string) => path.startsWith("/admin/clientes") },
  { label: "Importar", href: "/admin/produtos/importar", icon: Upload, match: (path: string) => path === "/admin/produtos/importar" },
];

export default function AdminBottomNav() {
  const [location] = useLocation();
  const { unreadByType } = useAdminNotifications();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8D5C4] bg-white/95 backdrop-blur-md lg:hidden"
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
              className={`relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold transition-colors active:scale-95 ${
                isActive ? "text-[#C4522A]" : "text-[#8B6F5E]"
              }`}
            >
              <span className="relative">
                <Icon className={`size-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#C4522A] px-1 text-[9px] font-bold text-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[#C4522A]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
