import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartEmptyState from "@/components/cart/CartEmptyState";
import CartItemRow from "@/components/cart/CartItemRow";
import CartSummary from "@/components/cart/CartSummary";
import CartTrustBadges from "@/components/cart/CartTrustBadges";
import { useCart } from "@/contexts/CartContext";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "wouter";
import { ArrowLeft, Trash2 } from "lucide-react";
import { usePageMeta } from "@/lib/seo";

export default function CartPage() {
  const { items, itemCount, isLoading, clearCart, isUpdating } = useCart();

  usePageMeta({
    title: "Carrinho — Nativa Store",
    description: "Revise os itens do seu carrinho na Nativa Store antes de finalizar a compra.",
    path: "/carrinho",
    noIndex: true,
  });

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <Navbar />

      <main className="pt-20 md:pt-24 pb-16">
        <div className="container max-w-6xl">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href="/"
                    className="text-[#8B6F5E] hover:text-[#C4522A] transition-colors"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    Início
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage
                  className="text-[#3D2B1F] font-medium"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Carrinho
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-8">
            <h1
              className="text-3xl md:text-4xl font-bold text-[#3D2B1F] mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Seu carrinho
            </h1>
            <p className="text-[#8B6F5E]" style={{ fontFamily: "'Lora', serif" }}>
              Revise seus itens antes de finalizar a compra
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner className="size-10 text-[#C4522A]" />
            </div>
          ) : itemCount === 0 ? (
            <div className="rounded-2xl border border-[#E8D5C4] bg-white">
              <CartEmptyState />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Link
                    href="/#colecoes"
                    className="inline-flex items-center gap-1.5 text-sm text-[#8B6F5E] hover:text-[#C4522A] transition-colors"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    <ArrowLeft size={16} />
                    Continuar comprando
                  </Link>
                  <button
                    type="button"
                    onClick={() => clearCart()}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 text-sm text-[#8B6F5E] hover:text-[#C4522A] transition-colors disabled:opacity-50"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    <Trash2 size={14} />
                    Esvaziar carrinho
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item) => (
                    <CartItemRow key={item.id} item={item} />
                  ))}
                </div>
              </div>

              <div className="lg:sticky lg:top-28 space-y-4">
                <CartSummary />
                <CartTrustBadges />
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
