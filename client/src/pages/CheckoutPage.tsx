import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { Link } from "wouter";
import { ArrowLeft, Clock, ShoppingBag } from "lucide-react";
import { useEffect } from "react";

export default function CheckoutPage() {
  const { itemCount } = useCart();

  useEffect(() => {
    document.title = "Checkout — Nativa Store";
    return () => {
      document.title = "Nativa Store — Artesanato com Alma";
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <Navbar />

      <main className="pt-20 md:pt-24 pb-16">
        <div className="container max-w-lg">
          <div className="rounded-2xl border border-[#E8D5C4] bg-white p-8 md:p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F]">
              <Clock size={36} strokeWidth={1.5} />
            </div>

            <h1
              className="text-2xl md:text-3xl font-bold text-[#3D2B1F] mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Checkout em breve
            </h1>

            <p
              className="text-[#8B6F5E] mb-6 leading-relaxed"
              style={{ fontFamily: "'Lora', serif" }}
            >
              Estamos preparando a experiência de pagamento para você.
              {itemCount > 0 && (
                <>
                  {" "}
                  Seus <strong className="text-[#3D2B1F]">{itemCount} itens</strong> estão
                  salvos no carrinho.
                </>
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/carrinho"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #C4522A, #E8821A)",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                <ShoppingBag size={16} />
                Voltar ao carrinho
              </Link>
              <Link
                href="/#colecoes"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8D5C4] px-6 py-3 text-sm font-semibold text-[#3D2B1F] hover:bg-[#F5F0E8] transition-colors"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                <ArrowLeft size={16} />
                Continuar comprando
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
