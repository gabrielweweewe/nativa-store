/**
 * Nativa Store — Product Page (PDP)
 * Design: Brasil Vivo — Artesanato com Alma
 * Mobile-first editorial layout with sticky purchase bar
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  FeatherOrange,
  FeatherGreen,
  FeatherBlue,
  WaveDividerDown,
  WaveDividerUp,
  ArrowNativa,
} from "@/components/NativaDecorations";
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
  const [highlightSizes, setHighlightSizes] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);

  const { addItem, openDrawer, isUpdating } = useCart();
  const mainCtaRef = useRef<HTMLDivElement>(null);
  const sizeSectionRef = useRef<HTMLDivElement>(null);

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
      setIsFav(false);
      setHighlightSizes(false);
      window.scrollTo(0, 0);
    }
    return () => {
      document.title = "Nativa Store — Artesanato com Alma";
    };
  }, [product]);

  useEffect(() => {
    const target = mainCtaRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyCta(!entry.isIntersecting);
      },
      { threshold: 0.15, rootMargin: "-48px 0px 0px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [product]);

  const descriptionHtml = useMemo(
    () => sanitizeProductHtml(product?.description ?? ""),
    [product?.description],
  );

  const handleAddToCart = useCallback(async () => {
    if (!product) return;

    if (!selectedSize) {
      toast.error("Selecione um tamanho");
      setHighlightSizes(true);
      sizeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
  }, [addItem, openDrawer, product, quantity, selectedColor, selectedSize]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#F5F0E8" }}>
        <p className="text-[#8B6F5E]" style={{ fontFamily: "'Lora', serif" }}>
          Carregando produto...
        </p>
      </div>
    );
  }

  if (notFound || !product) {
    return <NotFound />;
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <Navbar />

      <main className="relative overflow-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-20 md:pb-20 md:pt-24 lg:pb-16">
        <div className="pointer-events-none absolute right-4 top-28 opacity-25 feather-float sm:right-8 sm:opacity-30">
          <FeatherOrange className="h-12 w-5 rotate-[20deg] sm:h-14 sm:w-6" />
        </div>
        <div className="pointer-events-none absolute bottom-48 left-3 opacity-20 feather-float-delay sm:left-6">
          <FeatherGreen className="h-11 w-5 rotate-[10deg]" />
        </div>
        <div className="pointer-events-none absolute right-[18%] top-[42%] hidden opacity-15 feather-float-delay2 md:block">
          <FeatherBlue className="h-10 w-4 rotate-[-12deg]" />
        </div>

        <div className="container relative">
          {/* Breadcrumb — enxuto no mobile */}
          <Breadcrumb className="mb-4 sm:mb-6">
            <BreadcrumbList className="flex-nowrap overflow-hidden">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href="/"
                    className="text-[#8B6F5E] transition-colors hover:text-[#C4522A]"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    Início
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink asChild>
                  <Link
                    href="/#colecoes"
                    className="text-[#8B6F5E] transition-colors hover:text-[#C4522A]"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    Coleções
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href="/#colecoes"
                    className="text-[#8B6F5E] transition-colors hover:text-[#C4522A]"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("nativa:set-category", { detail: product.category }),
                      );
                    }}
                  >
                    {product.category}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage
                  className="max-w-[10rem] truncate font-medium text-[#3D2B1F] sm:max-w-[16rem] md:max-w-none"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  {product.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-12 grid grid-cols-1 items-start gap-6 lg:mb-16 lg:grid-cols-2 lg:gap-10 xl:gap-14">
            <div className="w-full lg:sticky lg:top-28">
              <ProductGallery
                images={product.images}
                productName={product.name}
                badge={product.badge}
                badgeColor={product.badgeColor}
                discount={discount}
              />
            </div>

            <div className="flex w-full flex-col gap-5 sm:gap-6">
              {/* Cabeçalho + preço (acima da dobra no mobile) */}
              <div>
                <p
                  className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2D6A4F] sm:text-xs"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  {product.category}
                </p>

                <h1
                  className="mb-3 text-[1.75rem] font-bold leading-[1.15] text-[#3D2B1F] sm:text-3xl md:text-4xl xl:text-[2.75rem]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {product.name}
                </h1>

                <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={15}
                        className={
                          i < Math.floor(product.rating)
                            ? "fill-[#C9922A] text-[#C9922A]"
                            : "text-[#D4C5B5]"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {product.rating} · {product.reviews} avaliações
                  </span>
                </div>

                <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className="text-3xl font-bold text-[#C4522A] sm:text-4xl"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span
                      className="text-base text-[#B0A090] line-through sm:text-lg"
                      style={{ fontFamily: "'Nunito', sans-serif" }}
                    >
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  {discount != null && discount > 0 && (
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                      style={{ background: "#E8821A", fontFamily: "'Nunito', sans-serif" }}
                    >
                      Economize {discount}%
                    </span>
                  )}
                </div>

                <p
                  className="text-[15px] leading-relaxed text-[#8B6F5E] sm:text-base"
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  {decodeHtmlEntities(product.shortDescription)}
                </p>
              </div>

              {/* Painel de compra — aberto, sem card pesado */}
              <div className="space-y-5 rounded-[1.5rem] border border-[#E8D5C4]/70 bg-white/55 p-4 backdrop-blur-[2px] sm:space-y-6 sm:p-6">
                {product.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.highlights.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E8D5C4]/80 bg-[#F5F0E8]/80 px-3 py-1.5 text-xs font-semibold text-[#3D2B1F]"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                      >
                        <Sparkles size={11} className="text-[#C9922A]" />
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {product.colors.length > 0 && (
                  <div>
                    <p
                      className="mb-2.5 text-sm font-semibold text-[#3D2B1F]"
                      style={{ fontFamily: "'Nunito', sans-serif" }}
                    >
                      Cor: <span className="font-normal text-[#8B6F5E]">{selectedColor}</span>
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {product.colors.map((color) => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => setSelectedColor(color.name)}
                          className={`h-11 w-11 rounded-full border-2 transition-all duration-200 ${
                            selectedColor === color.name
                              ? "scale-110 border-[#2D6A4F] shadow-md ring-2 ring-[#2D6A4F]/25"
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

                {product.sizes.length > 0 && (
                  <div
                    ref={sizeSectionRef}
                    className={
                      highlightSizes && !selectedSize
                        ? "rounded-xl ring-2 ring-[#C4522A]/40 ring-offset-2 ring-offset-[#F5F0E8]"
                        : ""
                    }
                  >
                    <p
                      className="mb-2.5 text-sm font-semibold text-[#3D2B1F]"
                      style={{ fontFamily: "'Nunito', sans-serif" }}
                    >
                      Tamanho
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size.label}
                          type="button"
                          onClick={() => {
                            if (!size.available) return;
                            setSelectedSize(size.label);
                            setHighlightSizes(false);
                          }}
                          disabled={!size.available}
                          className={`min-w-[3.25rem] rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                            !size.available
                              ? "cursor-not-allowed border-[#E8D5C4] text-[#B0A090] line-through opacity-50"
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

                <div>
                  <p
                    className="mb-2.5 text-sm font-semibold text-[#3D2B1F]"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    Quantidade
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center overflow-hidden rounded-xl border border-[#E8D5C4] bg-[#F5F0E8]/70">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="flex h-11 w-11 items-center justify-center text-[#3D2B1F] transition-colors hover:bg-[#C4522A]/10"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus size={16} />
                      </button>
                      <span
                        className="w-12 text-center font-semibold text-[#3D2B1F]"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(product.stockCount, q + 1))}
                        className="flex h-11 w-11 items-center justify-center text-[#3D2B1F] transition-colors hover:bg-[#C4522A]/10"
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

                <div ref={mainCtaRef} className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isUpdating || !product.inStock}
                    className="nativa-btn-primary flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.01] hover:shadow-xl disabled:pointer-events-none disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #C4522A, #E8821A)",
                      fontFamily: "'Nunito', sans-serif",
                      boxShadow: "0 10px 28px oklch(0.52 0.14 38 / 0.28)",
                    }}
                  >
                    <ShoppingBag size={20} />
                    {product.inStock ? "Adicionar ao Carrinho" : "Esgotado"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFav(!isFav);
                      toast(isFav ? "Removido dos favoritos" : "Adicionado aos favoritos!");
                    }}
                    className={`flex items-center justify-center rounded-2xl border-2 px-5 py-4 transition-all duration-200 ${
                      isFav
                        ? "border-[#C4522A] bg-[#C4522A]/10 text-[#C4522A]"
                        : "border-[#E8D5C4] text-[#3D2B1F] hover:border-[#C4522A]/50"
                    }`}
                    aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Heart size={20} className={isFav ? "fill-[#C4522A]" : ""} />
                  </button>
                </div>

                <ProductShippingQuote
                  productId={product.slug}
                  productPrice={product.price}
                  quantity={quantity}
                />

                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
                  {[
                    { icon: Truck, label: "Frete grátis", sub: "Acima de R$ 299" },
                    { icon: Shield, label: "Compra segura", sub: "Pagamento protegido" },
                    { icon: RotateCcw, label: "Troca fácil", sub: "Até 30 dias" },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div
                      key={label}
                      className="flex min-w-[9.5rem] shrink-0 items-center gap-3 rounded-2xl border border-[#E8D5C4]/70 bg-[#F5F0E8]/80 px-3 py-3 sm:min-w-0 sm:flex-col sm:items-center sm:gap-1.5 sm:px-2 sm:text-center"
                    >
                      <Icon size={18} className="shrink-0 text-[#2D6A4F]" />
                      <div>
                        <p
                          className="text-xs font-bold text-[#3D2B1F]"
                          style={{ fontFamily: "'Nunito', sans-serif" }}
                        >
                          {label}
                        </p>
                        <p
                          className="text-xs leading-snug text-[#8B6F5E]"
                          style={{ fontFamily: "'Nunito', sans-serif" }}
                        >
                          {sub}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <p
                  className="text-center text-xs text-[#8B6F5E]"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  SKU: {product.sku}
                </p>
              </div>

              {/* Artesã — faixa editorial */}
              {product.artisan?.name && (
                <div className="relative overflow-hidden rounded-[1.5rem] border border-[#E8D5C4]/60 bg-gradient-to-br from-[#F5F0E8] via-white/40 to-[#E8DFD0]/50 p-5 sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <ArrowNativa className="h-4 w-8" />
                    <p
                      className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2D6A4F]"
                      style={{ fontFamily: "'Nunito', sans-serif" }}
                    >
                      Feito por mãos brasileiras
                    </p>
                  </div>
                  <h3
                    className="mb-1 text-xl font-bold text-[#3D2B1F] sm:text-2xl"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {product.artisan.name}
                  </h3>
                  {product.artisan.region && (
                    <p
                      className="mb-3 flex items-center gap-1.5 text-sm text-[#8B6F5E]"
                      style={{ fontFamily: "'Nunito', sans-serif" }}
                    >
                      <MapPin size={14} className="text-[#C4522A]" />
                      {product.artisan.region}
                    </p>
                  )}
                  {product.artisan.story && (
                    <p
                      className="text-[15px] leading-relaxed text-[#8B6F5E] italic sm:text-base"
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      {product.artisan.story}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pointer-events-none">
          <WaveDividerDown color="#FAF7F2" />
        </div>

        {/* Detalhes */}
        <section className="nativa-texture relative py-12 md:py-16" style={{ background: "#FAF7F2" }}>
          <div className="container">
            <div className="mb-6 flex items-center gap-3 sm:mb-8">
              <span className="h-px w-8 bg-[#C4522A]/35 sm:w-12" />
              <h2
                className="text-2xl font-bold text-[#3D2B1F] md:text-3xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Detalhes da Peça
              </h2>
            </div>

            <Accordion
              type="single"
              collapsible
              defaultValue="description"
              className="overflow-hidden rounded-[1.35rem] border border-[#E8D5C4]/80 bg-white/80"
            >
              <AccordionItem value="description" className="border-[#E8D5C4] px-4 sm:px-6">
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

              <AccordionItem value="materials" className="border-[#E8D5C4] px-4 sm:px-6">
                <AccordionTrigger
                  className="text-base font-semibold text-[#3D2B1F] hover:no-underline"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Materiais e Composição
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pb-2">
                    {product.materials.map((m) => (
                      <li
                        key={m}
                        className="flex items-start gap-2 text-[#8B6F5E]"
                        style={{ fontFamily: "'Lora', serif" }}
                      >
                        <Package size={14} className="mt-1 flex-shrink-0 text-[#2D6A4F]" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="care" className="border-[#E8D5C4] px-4 sm:px-6">
                <AccordionTrigger
                  className="text-base font-semibold text-[#3D2B1F] hover:no-underline"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Cuidados
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pb-2">
                    {product.careInstructions.map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-2 text-[#8B6F5E]"
                        style={{ fontFamily: "'Lora', serif" }}
                      >
                        <span className="mt-0.5 text-[#C4522A]">✦</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {product.faq.length > 0 && (
                <AccordionItem value="faq" className="border-[#E8D5C4] px-4 sm:px-6">
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
                          <p
                            className="mb-1 text-sm font-semibold text-[#3D2B1F]"
                            style={{ fontFamily: "'Nunito', sans-serif" }}
                          >
                            {item.question}
                          </p>
                          <p className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Lora', serif" }}>
                            {item.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </section>

        <div className="pointer-events-none" style={{ background: "#FAF7F2" }}>
          <WaveDividerUp color="#F5F0E8" />
        </div>

        {/* Relacionados */}
        {relatedProducts.length > 0 && (
          <section className="relative py-12 md:py-16" style={{ background: "#F5F0E8" }}>
            <div className="container">
              <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
                <div>
                  <p
                    className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2D6A4F]"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    Você também pode gostar
                  </p>
                  <h2
                    className="text-2xl font-bold text-[#3D2B1F] md:text-3xl"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Peças Relacionadas
                  </h2>
                </div>
                <Link
                  href="/#colecoes"
                  className="shrink-0 text-sm font-semibold text-[#C4522A] hover:underline"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Ver todas
                </Link>
              </div>

              <div className="scrollbar-hide -mx-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-3 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
                {relatedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="w-[72%] max-w-[280px] shrink-0 snap-start sm:w-[58%] md:w-auto md:max-w-none md:shrink"
                  >
                    <ProductCard product={p} variant="compact" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Sticky CTA — mobile */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#E8D5C4]/80 bg-[#F5F0E8]/95 backdrop-blur-md transition-transform duration-300 lg:hidden ${
          showStickyCta ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="container flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-xs text-[#8B6F5E]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {product.name}
            </p>
            <p
              className="text-lg font-bold leading-tight text-[#C4522A]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {formatPrice(product.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isUpdating || !product.inStock}
            className="flex shrink-0 items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-md disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #C4522A, #E8821A)",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            <ShoppingBag size={18} />
            Adicionar
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
