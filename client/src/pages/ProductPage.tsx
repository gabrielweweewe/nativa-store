/**
 * Nativa Store — Product Page (PDP)
 * Design: Brasil Vivo — Artesanato com Alma
 * Complete product detail page with gallery, options, and artisan story
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { decodeHtmlEntities, sanitizeProductHtml } from "@/lib/productHtml";
import {
  Heart,
  ShoppingBag,
  Star,
  Truck,
  Shield,
  RotateCcw,
  Minus,
  Plus,
  ChevronLeft,
  Sparkles,
  Package,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import ProductShippingQuote from "@/components/product/ProductShippingQuote";
import { FeatherOrange, FeatherGreen } from "@/components/NativaDecorations";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatPrice, fetchProductBySlug, fetchProducts, getRelatedProducts } from "@/lib/products";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@shared/types/product";
import NotFound from "@/pages/NotFound";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isFav, setIsFav] = useState(false);
  const { addItem, openDrawer, isUpdating } = useCart();

  useEffect(() => {
    const slug = params.slug ?? "";
    let cancelled = false;

    setLoading(true);
    setNotFound(false);
    setProduct(null);

    Promise.all([fetchProductBySlug(slug), fetchProducts()])
      .then(([loadedProduct, allProducts]) => {
        if (cancelled) return;

        if (!loadedProduct) {
          setNotFound(true);
          return;
        }

        setProduct(loadedProduct);
        setRelatedProducts(getRelatedProducts(allProducts, loadedProduct));
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  useEffect(() => {
    if (product) {
      document.title = `${product.name} — Nativa Store`;
      setSelectedSize(product.sizes.find((s) => s.available)?.label ?? "");
      setSelectedColor(product.colors[0]?.name ?? "");
      setQuantity(1);
      window.scrollTo(0, 0);
    }
    return () => {
      document.title = "Nativa Store — Artesanato com Alma";
    };
  }, [product]);

  const descriptionHtml = useMemo(
    () => sanitizeProductHtml(product?.description ?? ""),
    [product?.description],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAF7F2" }}>
        <p className="text-[#8B6F5E]" style={{ fontFamily: "'Lora', serif" }}>
          Carregando produto...
        </p>
      </div>
    );
  }

  if (notFound || !product) {
    return <NotFound />;
  }

  const discount =
    product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const handleAddToCart = async () => {
    if (!selectedSize) {
      toast.error("Selecione um tamanho");
      return;
    }

    const ok = await addItem({
      productSlug: product.slug,
      quantity,
      size: selectedSize,
      color: selectedColor,
    });

    if (ok) {
      toast.success(`${product.name} adicionada ao carrinho!`, {
        description: `${quantity}x ${selectedSize}${product.colors.length > 1 ? ` · ${selectedColor}` : ""}`,
      });
      openDrawer();
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <Navbar />

      <main className="pt-20 md:pt-24 pb-16 relative overflow-hidden">
        <div className="absolute top-32 right-8 feather-float opacity-25 pointer-events-none">
          <FeatherOrange className="w-6 h-14 rotate-[20deg]" />
        </div>
        <div className="absolute bottom-40 left-6 feather-float-delay opacity-20 pointer-events-none">
          <FeatherGreen className="w-5 h-12 rotate-[10deg]" />
        </div>

        <div className="container">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="text-[#8B6F5E] hover:text-[#C4522A] transition-colors" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    Início
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/#colecoes" className="text-[#8B6F5E] hover:text-[#C4522A] transition-colors" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    Coleções
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <span className="text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {product.category}
                  </span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[#3D2B1F] font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {product.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Back link — mobile */}
          <Link
            href="/#colecoes"
            className="inline-flex items-center gap-1.5 text-sm text-[#8B6F5E] hover:text-[#C4522A] transition-colors mb-6 md:hidden"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            <ChevronLeft size={16} />
            Voltar às coleções
          </Link>

          {/* Main grid — duas colunas equilibradas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 lg:items-start mb-16">
            {/* Galeria */}
            <div className="w-full lg:sticky lg:top-28">
              <ProductGallery
                images={product.images}
                productName={product.name}
                badge={product.badge}
                badgeColor={product.badgeColor}
                discount={discount}
              />
            </div>

            {/* Informações + compra */}
            <div className="flex flex-col gap-6 w-full">
              {/* Cabeçalho do produto */}
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ fontFamily: "'Nunito', sans-serif", color: "#1B7A8C" }}
                >
                  {product.category}
                </p>

                <h1
                  className="text-3xl md:text-4xl xl:text-[2.75rem] font-bold text-[#3D2B1F] leading-tight mb-3"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {product.name}
                </h1>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < Math.floor(product.rating) ? "fill-[#C9922A] text-[#C9922A]" : "text-[#D4C5B5]"}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {product.rating} · {product.reviews} avaliações
                  </span>
                </div>

                <p
                  className="text-[#8B6F5E] text-base leading-relaxed"
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  {decodeHtmlEntities(product.shortDescription)}
                </p>
              </div>

              {/* Painel de compra */}
              <div
                className="rounded-2xl border border-[#E8D5C4] bg-white p-5 md:p-6 shadow-sm space-y-5"
                style={{ boxShadow: "0 8px 32px oklch(0.52 0.14 38 / 0.06)" }}
              >
                {/* Preço */}
                <div className="flex items-baseline gap-3 pb-5 border-b border-[#E8D5C4]/80">
                  <span
                    className="text-3xl md:text-4xl font-bold text-[#C4522A]"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-lg text-[#B0A090] line-through" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  {discount != null && discount > 0 && (
                    <span
                      className="ml-auto text-xs font-bold text-white px-2.5 py-1 rounded-full"
                      style={{ background: "#E8821A", fontFamily: "'Nunito', sans-serif" }}
                    >
                      Economize {discount}%
                    </span>
                  )}
                </div>

                {/* Tags */}
                {product.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.highlights.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E8D5C4] bg-[#FAF7F2] px-3 py-1 text-xs font-semibold text-[#3D2B1F]"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                      >
                        <Sparkles size={11} className="text-[#C9922A]" />
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {/* Cor */}
                {product.colors.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-[#3D2B1F] mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      Cor: <span className="font-normal text-[#8B6F5E]">{selectedColor}</span>
                    </p>
                    <div className="flex gap-2">
                      {product.colors.map((color) => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => setSelectedColor(color.name)}
                          className={`w-9 h-9 rounded-full border-2 transition-all duration-200 ${
                            selectedColor === color.name
                              ? "border-[#C4522A] scale-110 shadow-md"
                              : "border-[#E8D5C4] hover:border-[#C4522A]/50"
                          }`}
                          style={{ background: color.hex }}
                          title={color.name}
                          aria-label={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tamanho */}
                {product.sizes.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-[#3D2B1F] mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      Tamanho
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size.label}
                          type="button"
                          onClick={() => size.available && setSelectedSize(size.label)}
                          disabled={!size.available}
                          className={`min-w-[3rem] px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                            !size.available
                              ? "border-[#E8D5C4] text-[#B0A090] line-through cursor-not-allowed opacity-50"
                              : selectedSize === size.label
                                ? "border-[#C4522A] bg-[#C4522A] text-white shadow-md"
                                : "border-[#E8D5C4] text-[#3D2B1F] hover:border-[#C4522A]/50"
                          }`}
                          style={{ fontFamily: "'Nunito', sans-serif" }}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantidade */}
                <div>
                  <p className="text-sm font-semibold text-[#3D2B1F] mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    Quantidade
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center border border-[#E8D5C4] rounded-xl overflow-hidden bg-[#FAF7F2]">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 flex items-center justify-center text-[#3D2B1F] hover:bg-[#C4522A]/10 transition-colors"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center font-semibold text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(product.stockCount, q + 1))}
                        className="w-10 h-10 flex items-center justify-center text-[#3D2B1F] hover:bg-[#C4522A]/10 transition-colors"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <span className="text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {product.stockCount} unidades disponíveis
                    </span>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isUpdating || !product.inStock}
                    className="flex-1 py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] disabled:opacity-60 disabled:pointer-events-none"
                    style={{
                      background: "linear-gradient(135deg, #C4522A, #E8821A)",
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    <ShoppingBag size={20} />
                    Adicionar ao Carrinho
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFav(!isFav);
                      toast(isFav ? "Removido dos favoritos" : "Adicionado aos favoritos!");
                    }}
                    className={`px-5 py-4 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${
                      isFav
                        ? "border-[#C4522A] bg-[#C4522A]/10 text-[#C4522A]"
                        : "border-[#E8D5C4] text-[#3D2B1F] hover:border-[#C4522A]/50"
                    }`}
                    aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Heart size={20} className={isFav ? "fill-[#C4522A]" : ""} />
                  </button>
                </div>

                {/* Frete */}
                <ProductShippingQuote productPrice={product.price} quantity={quantity} />

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {[
                    { icon: Truck, label: "Frete grátis", sub: "Acima de R$ 299" },
                    { icon: Shield, label: "Compra segura", sub: "Pagamento protegido" },
                    { icon: RotateCcw, label: "Troca fácil", sub: "Até 30 dias" },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="text-center rounded-xl bg-[#FAF7F2] border border-[#E8D5C4]/60 py-3 px-1">
                      <Icon size={18} className="mx-auto mb-1.5 text-[#2D6A4F]" />
                      <p className="text-[11px] font-bold text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        {label}
                      </p>
                      <p className="text-[9px] text-[#8B6F5E] leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        {sub}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-[#8B6F5E] text-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  SKU: {product.sku}
                </p>
              </div>

              {/* Artesã */}
              {product.artisan?.name && (
                <div className="rounded-2xl border border-[#E8D5C4] bg-gradient-to-br from-[#F5F0E8] to-white p-5 md:p-6">
                  <p
                    className="text-xs font-bold uppercase tracking-widest text-[#1B7A8C] mb-3"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    Feito por
                  </p>
                  <h3
                    className="text-xl font-bold text-[#3D2B1F] mb-1"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {product.artisan.name}
                  </h3>
                  {product.artisan.region && (
                    <p
                      className="flex items-center gap-1.5 text-sm text-[#8B6F5E] mb-3"
                      style={{ fontFamily: "'Nunito', sans-serif" }}
                    >
                      <MapPin size={14} className="text-[#C4522A]" />
                      {product.artisan.region}
                    </p>
                  )}
                  {product.artisan.story && (
                    <p
                      className="text-sm text-[#8B6F5E] leading-relaxed italic"
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      {product.artisan.story}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Details accordion */}
          <section className="mb-16">
            <h2
              className="text-2xl md:text-3xl font-bold text-[#3D2B1F] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Detalhes da Peça
            </h2>
            <Accordion type="single" collapsible defaultValue="description" className="rounded-2xl border border-[#E8D5C4] bg-white overflow-hidden">
              <AccordionItem value="description" className="border-[#E8D5C4] px-6">
                <AccordionTrigger
                  className="text-base font-semibold text-[#3D2B1F] hover:no-underline"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Descrição
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    className="product-description pb-2"
                    style={{ fontFamily: "'Lora', serif" }}
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="materials" className="border-[#E8D5C4] px-6">
                <AccordionTrigger
                  className="text-base font-semibold text-[#3D2B1F] hover:no-underline"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Materiais e Composição
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pb-2">
                    {product.materials.map((m) => (
                      <li key={m} className="flex items-start gap-2 text-[#8B6F5E]" style={{ fontFamily: "'Lora', serif" }}>
                        <Package size={14} className="text-[#2D6A4F] mt-1 flex-shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="care" className="border-[#E8D5C4] px-6">
                <AccordionTrigger
                  className="text-base font-semibold text-[#3D2B1F] hover:no-underline"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Cuidados
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pb-2">
                    {product.careInstructions.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-[#8B6F5E]" style={{ fontFamily: "'Lora', serif" }}>
                        <span className="text-[#C4522A] mt-0.5">✦</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {product.faq.length > 0 && (
                <AccordionItem value="faq" className="border-[#E8D5C4] px-6">
                  <AccordionTrigger
                    className="text-base font-semibold text-[#3D2B1F] hover:no-underline"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    Perguntas Frequentes
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pb-2">
                      {product.faq.map((item) => (
                        <div key={item.question}>
                          <p className="font-semibold text-[#3D2B1F] text-sm mb-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
                            {item.question}
                          </p>
                          <p className="text-[#8B6F5E] text-sm" style={{ fontFamily: "'Lora', serif" }}>
                            {item.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </section>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <section>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-widest text-[#1B7A8C] mb-1"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    Você também pode gostar
                  </p>
                  <h2
                    className="text-2xl md:text-3xl font-bold text-[#3D2B1F]"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Peças Relacionadas
                  </h2>
                </div>
                <Link
                  href="/#colecoes"
                  className="hidden sm:inline text-sm font-semibold text-[#C4522A] hover:underline"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Ver todas
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} variant="compact" />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
