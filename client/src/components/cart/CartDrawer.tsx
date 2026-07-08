import { useCart } from "@/contexts/CartContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import CartEmptyState from "./CartEmptyState";
import CartItemRow from "./CartItemRow";
import CartSummary from "./CartSummary";

export default function CartDrawer() {
  const { isDrawerOpen, closeDrawer, items, itemCount, isLoading } = useCart();

  return (
    <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-[#E8D5C4] bg-[#FAF7F2] p-0 sm:max-w-[420px]"
      >
        <SheetHeader className="border-b border-[#E8D5C4] bg-[#F5F0E8] px-5 py-4">
          <SheetTitle
            className="text-[#3D2B1F]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Seu carrinho
          </SheetTitle>
          <SheetDescription style={{ fontFamily: "'Nunito', sans-serif" }}>
            {itemCount === 0
              ? "Nenhum item adicionado ainda"
              : `${itemCount} ${itemCount === 1 ? "item" : "itens"} selecionado${itemCount === 1 ? "" : "s"}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner className="size-8 text-[#C4522A]" />
            </div>
          ) : itemCount === 0 ? (
            <CartEmptyState compact />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {items.map((item) => (
                  <CartItemRow key={item.id} item={item} compact />
                ))}
              </div>

              <div className="border-t border-[#E8D5C4] bg-white px-4 py-4 space-y-3">
                <CartSummary compact showCoupon={false} onCheckout={closeDrawer} />
                <Link
                  href="/carrinho"
                  onClick={closeDrawer}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#C4522A]/25 py-2.5 text-sm font-semibold text-[#C4522A] hover:bg-[#C4522A]/5 transition-colors"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Ver carrinho completo
                  <ExternalLink size={14} />
                </Link>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
