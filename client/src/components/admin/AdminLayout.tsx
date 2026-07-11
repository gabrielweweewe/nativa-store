import NativaLogo from "@/components/NativaLogo";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import AdminNotificationsBell from "@/components/admin/AdminNotificationsBell";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminNotifications } from "@/contexts/AdminNotificationsContext";
import "@/styles/admin-theme.css";
import {
  ChevronLeft,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Package,
  Plug,
  ShoppingCart,
  Upload,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  badgeKey?: "new_order" | "new_customer";
  match?: (path: string) => boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    match: (path) => path === "/admin/dashboard" || path === "/admin",
  },
  {
    label: "Produtos",
    href: "/admin/produtos",
    icon: Package,
    match: (path) => path.startsWith("/admin/produtos") && path !== "/admin/produtos/importar",
  },
  { label: "Importar produtos", href: "/admin/produtos/importar", icon: Upload },
  {
    label: "Pedidos",
    href: "/admin/pedidos",
    icon: ShoppingCart,
    badgeKey: "new_order",
    match: (path) => path.startsWith("/admin/pedidos"),
  },
  {
    label: "Clientes",
    href: "/admin/clientes",
    icon: Users,
    badgeKey: "new_customer",
    match: (path) => path.startsWith("/admin/clientes"),
  },
  {
    label: "Banners",
    href: "/admin/banners",
    icon: ImageIcon,
    match: (path) => path.startsWith("/admin/banners"),
  },
  {
    label: "Integrações",
    href: "/admin/integracoes",
    icon: Plug,
    match: (path) => path.startsWith("/admin/integracoes"),
  },
];

function isNavActive(item: NavItem, location: string) {
  if (item.match) return item.match(location);
  return location === item.href || location.startsWith(`${item.href}/`);
}

function NavLinks({
  onNavigate,
  unreadByType,
  variant = "sidebar",
}: {
  onNavigate?: () => void;
  unreadByType: { new_order: number; new_customer: number };
  variant?: "sidebar" | "sheet";
}) {
  const [location] = useLocation();

  return (
    <nav className="flex flex-1 flex-col gap-1.5 p-3">
      {navItems.map((item) => {
        const isActive = isNavActive(item, location);
        const Icon = item.icon;
        const badgeCount = item.badgeKey ? unreadByType[item.badgeKey] : 0;

        if (item.disabled) {
          return (
            <div
              key={item.href}
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--admin-text-muted)]"
              title="Em breve"
            >
              <Icon className="size-4" />
              {item.label}
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Em breve
              </span>
            </div>
          );
        }

        const linkClass =
          variant === "sheet"
            ? `admin-mobile-nav-link ${
                isActive ? "admin-mobile-nav-link-active" : "admin-mobile-nav-link-inactive"
              }`
            : `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "admin-nav-active shadow-sm"
                  : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-hover)]"
              }`;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={linkClass}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {badgeCount > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-[var(--admin-accent)] text-white"
                }`}
              >
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayout({
  title,
  children,
  actions,
  backHref,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  backHref?: string;
}) {
  const { logout } = useAdminAuth();
  const { unreadByType } = useAdminNotifications();
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    setLocation("/admin/login");
  }

  return (
    <div className="admin-app min-h-[100dvh]">
      <aside className="admin-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r lg:flex">
        <div className="flex items-center gap-2 border-b border-[var(--admin-border)] px-4 py-4">
          <NativaLogo className="h-9 w-auto" />
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
              Nativa
            </span>
            <span className="block text-sm font-bold text-[var(--admin-text)]">Painel Admin</span>
          </div>
        </div>
        <NavLinks unreadByType={unreadByType} />
        <div className="border-t border-[var(--admin-border)] p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-hover)]"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header
          className="admin-header sticky top-0 z-20 border-b"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {backHref ? (
                <Button variant="ghost" size="icon-sm" className="shrink-0 lg:hidden" asChild>
                  <Link href={backHref} aria-label="Voltar">
                    <ChevronLeft className="size-5" />
                  </Link>
                </Button>
              ) : (
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="shrink-0 lg:hidden">
                      <MoreHorizontal className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="admin-sheet max-h-[85dvh] rounded-t-3xl border-t p-0 shadow-2xl"
                  >
                    <SheetHeader className="border-b border-[var(--admin-border)] px-4 py-4">
                      <SheetTitle asChild>
                        <div className="flex items-center gap-2">
                          <NativaLogo className="h-8 w-auto" />
                          <span className="admin-sheet-title text-sm">Menu admin</span>
                        </div>
                      </SheetTitle>
                    </SheetHeader>
                    <NavLinks
                      variant="sheet"
                      onNavigate={() => setMenuOpen(false)}
                      unreadByType={unreadByType}
                    />
                    <div className="border-t border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                      <Button
                        variant="ghost"
                        className="h-12 w-full justify-start gap-3 rounded-xl font-medium text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-hover)]"
                        onClick={handleLogout}
                      >
                        <LogOut className="size-4" />
                        Sair da conta
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              <h1 className="truncate text-base font-bold tracking-tight text-[var(--admin-text)] sm:text-xl">
                {title}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <AdminNotificationsBell />
              {actions && <div className="hidden items-center gap-2 sm:flex">{actions}</div>}
            </div>
          </div>
        </header>

        <main className="px-3 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:pb-6">
          {children}
        </main>
      </div>

      <AdminBottomNav />
    </div>
  );
}
