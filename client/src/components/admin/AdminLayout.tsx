import NativaLogo from "@/components/NativaLogo";
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
  LayoutGrid,
  LogOut,
  Menu,
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
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#8B6F5E]/50 cursor-not-allowed"
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
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
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
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { logout } = useAdminAuth();
  const { unreadByType } = useAdminNotifications();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    setLocation("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]" style={{ fontFamily: "'Nunito', sans-serif" }}>
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
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#E8D5C4] bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="border-b border-[#E8D5C4] px-4 py-4">
                  <SheetTitle asChild>
                    <div className="flex items-center gap-2">
                      <NativaLogo className="h-9 w-auto" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#8B6F5E]">
                        Admin
                      </span>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <NavLinks onNavigate={() => setMobileOpen(false)} unreadByType={unreadByType} />
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
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <LayoutGrid className="hidden size-5 text-[#C4522A] sm:block" />
              <h1
                className="text-lg font-bold text-[#3D2B1F] sm:text-xl"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AdminNotificationsBell />
            {actions}
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
