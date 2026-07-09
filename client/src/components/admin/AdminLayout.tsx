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
import {
  ChevronLeft,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  Package,
  Settings,
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
}

const navItems: NavItem[] = [
  { label: "Produtos", href: "/admin/produtos", icon: Package },
  { label: "Importar produtos", href: "/admin/produtos/importar", icon: Upload },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingCart, badgeKey: "new_order" },
  { label: "Clientes", href: "/admin/clientes", icon: Users, badgeKey: "new_customer" },
  { label: "Configurações", href: "/admin/configuracoes", icon: Settings, disabled: true },
];

function NavLinks({
  onNavigate,
  unreadByType,
}: {
  onNavigate?: () => void;
  unreadByType: { new_order: number; new_customer: number };
}) {
  const [location] = useLocation();

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((item) => {
        const isActive = location === item.href || location.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const badgeCount = item.badgeKey ? unreadByType[item.badgeKey] : 0;

        if (item.disabled) {
          return (
            <div
              key={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#8B6F5E]/50 cursor-not-allowed"
              title="Em breve"
            >
              <Icon className="size-4" />
              {item.label}
              <span className="ml-auto rounded-full bg-[#F5F0E8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8B6F5E]">
                Em breve
              </span>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[#C4522A] text-white shadow-sm"
                : "text-[#3D2B1F] hover:bg-[#F5F0E8]"
            }`}
          >
            <Icon className="size-4" />
            {item.label}
            {badgeCount > 0 && (
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-[#C4522A] text-white"
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
    <div className="min-h-[100dvh] bg-[#FAF7F2]" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#E8D5C4] bg-white lg:flex">
        <div className="flex items-center gap-2 border-b border-[#E8D5C4] px-4 py-4">
          <NativaLogo className="h-9 w-auto" />
          <span className="text-xs font-semibold uppercase tracking-wide text-[#8B6F5E]">
            Admin
          </span>
        </div>
        <NavLinks unreadByType={unreadByType} />
        <div className="border-t border-[#E8D5C4] p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-[#3D2B1F] hover:bg-[#F5F0E8]"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header
          className="sticky top-0 z-20 border-b border-[#E8D5C4] bg-white/90 backdrop-blur-md"
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
                  <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-3xl p-0">
                    <SheetHeader className="border-b border-[#E8D5C4] px-4 py-4">
                      <SheetTitle asChild>
                        <div className="flex items-center gap-2">
                          <NativaLogo className="h-8 w-auto" />
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#8B6F5E]">
                            Menu admin
                          </span>
                        </div>
                      </SheetTitle>
                    </SheetHeader>
                    <NavLinks onNavigate={() => setMenuOpen(false)} unreadByType={unreadByType} />
                    <div className="border-t border-[#E8D5C4] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                      <Button
                        variant="ghost"
                        className="h-12 w-full justify-start gap-3 rounded-xl text-[#3D2B1F] hover:bg-[#F5F0E8]"
                        onClick={handleLogout}
                      >
                        <LogOut className="size-4" />
                        Sair da conta
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              <div className="flex min-w-0 items-center gap-2">
                <LayoutGrid className="hidden size-5 shrink-0 text-[#C4522A] sm:block" />
                <h1
                  className="truncate text-base font-bold text-[#3D2B1F] sm:text-xl"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {title}
                </h1>
              </div>
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
