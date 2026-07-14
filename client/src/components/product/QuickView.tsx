/**
 * Quick view — bottom sheet no mobile, dialog no desktop.
 * Galeria com swipe + variantes sem sair da grade.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Heart, ShoppingBag, ExternalLink } from "lucide-react";
import type { Product } from "@shared/types/product";
import { formatPrice } from "@/lib/products";
import { showAddToCartReward } from "@/lib/cartReward";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useStoreDiscovery } from "@/contexts/StoreDiscoveryContext";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

function QuickViewGallery({
  product,
  onImageChange,
}: {
  product: Product;
  onImageChange: (src: string) => void;
}) {
  const images = useMemo(() => {
    const list = product.images?.length ? product.images : [product.image];
    return Array.from(new Set(list.filter(Boolean)));
  }, [product]);

  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!api) return;

    const sync = () => {
      const next = api.selectedScrollSnap();
      setIndex(next);
      onImageChange(images[next] ?? product.image);
    };

    sync();
    api.on("select", sync);
    return () => {
      api.off("select", sync);
    };
  }, [api, images, onImageChange, product.image]);

  useEffect(() => {
    setIndex(0);
    api?.scrollTo(0, true);
    onImageChange(images[0] ?? product.image);
  }, [product.slug, api, images, onImageChange, product.image]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#F5F0E8]">
      <Carousel
        setApi={setApi}
        opts={{ loop: images.length > 1, align: "start", dragFree: false }}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {images.map((src, i) => (
            <CarouselItem key={`${src}-${i}`} className="pl-0 basis-full">
              <img
                src={src}
                alt={`${product.name} — foto ${i + 1}`}
                className="aspect-[4/5] w-full object-cover sm:aspect-square"
                draggable={false}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div
        className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-white"
        style={{ background: product.badgeColor, fontFamily: "'Nunito', sans-serif" }}
      >
        {product.badge}
      </div>

      {images.length > 1 && (
        <>
          <div
            className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            {index + 1}/{images.length}
          </div>
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para foto ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/55"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function QuickViewBody({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { addItem, openDrawer, isUpdating } = useCart();
  const { isFavorite, toggleFavorite } = useWishlist();
  const fav = isFavorite(product.slug);

  const availableSizes = useMemo(
    () => product.sizes.filter((s) => s.available),
    [product.sizes],
  );

  const [selectedSize, setSelectedSize] = useState(
    () => availableSizes[0]?.label ?? "",
  );
  const [selectedColor, setSelectedColor] = useState(
    () => product.colors[0]?.name ?? "",
  );
  const [activeImage, setActiveImage] = useState(product.image);

  useEffect(() => {
    setSelectedSize(availableSizes[0]?.label ?? "");
    setSelectedColor(product.colors[0]?.name ?? "");
    setActiveImage(product.image);
  }, [product, availableSizes]);

  const handleAdd = async () => {
    if (!product.inStock || product.stockCount <= 0) return;
    if (!selectedSize) return;

    const ok = await addItem({
      productSlug: product.slug,
      quantity: 1,
      size: selectedSize,
      color: selectedColor,
    });

    if (ok) {
      showAddToCartReward({
        name: product.name,
        image: activeImage || product.image,
        price: product.price,
        details: `${selectedSize}${product.colors.length > 1 ? ` · ${selectedColor}` : ""}`,
      });
      onClose();
      openDrawer();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <QuickViewGallery product={product} onImageChange={setActiveImage} />

        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p
              className="text-xs font-semibold uppercase tracking-wider text-[#1B7A8C]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {product.category}
            </p>
            <h3
              className="text-xl font-semibold leading-snug text-[#3D2B1F]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {product.name}
            </h3>
            <div className="flex items-baseline gap-2 pt-0.5">
              <span
                className="text-2xl font-bold text-[#C4522A]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {formatPrice(product.price)}
              </span>
              {product.originalPrice ? (
                <span
                  className="text-sm text-[#B0A090] line-through"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  {formatPrice(product.originalPrice)}
                </span>
              ) : null}
            </div>
          </div>

          {product.colors.length > 0 && (
            <div className="space-y-2.5">
              <p
                className="text-xs font-semibold uppercase tracking-wider text-[#8B6F5E]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                Cor — {selectedColor || "escolha"}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color.name)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform active:scale-95 ${
                      selectedColor === color.name
                        ? "scale-105 border-[#C4522A]"
                        : "border-[#E8D5C4]"
                    }`}
                    style={{ background: color.hex }}
                    aria-label={color.name}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}

          {availableSizes.length > 0 && (
            <div className="space-y-2.5">
              <p
                className="text-xs font-semibold uppercase tracking-wider text-[#8B6F5E]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                Tamanho
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size.label}
                    type="button"
                    disabled={!size.available}
                    onClick={() => setSelectedSize(size.label)}
                    className={`min-h-11 min-w-11 rounded-xl border px-3 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${
                      selectedSize === size.label
                        ? "border-[#C4522A] bg-[#C4522A] text-white"
                        : "border-[#E8D5C4] bg-white text-[#3D2B1F]"
                    }`}
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2.5 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isUpdating || !product.inStock || !selectedSize}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white shadow-md transition-transform active:scale-[0.98] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #C4522A, #E8821A)",
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              <ShoppingBag size={18} />
              {product.inStock ? "Adicionar" : "Esgotado"}
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(product.slug, product.name)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 px-4 transition-colors ${
                fav
                  ? "border-[#C4522A] bg-[#C4522A]/10 text-[#C4522A]"
                  : "border-[#E8D5C4] text-[#3D2B1F]"
              }`}
              aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <Heart size={18} className={fav ? "fill-[#C4522A]" : ""} />
            </button>
          </div>

          <Link
            href={`/produto/${product.slug}`}
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-[#C4522A]"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Ver página completa
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function QuickView() {
  const { quickViewProduct, closeQuickView } = useStoreDiscovery();
  const isMobile = useIsMobile();
  const open = !!quickViewProduct;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && closeQuickView()} shouldScaleBackground={false}>
        <DrawerContent className="flex max-h-[94vh] flex-col overflow-hidden border-[#E8D5C4] bg-[#FAF7F2]">
          <DrawerHeader className="gap-2 px-5 pb-3 pt-2 text-left">
            <DrawerTitle
              className="text-xl leading-snug text-[#3D2B1F]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Visualização rápida
            </DrawerTitle>
            <DrawerDescription
              className="text-sm leading-normal text-[#8B6F5E]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Deslize as fotos · escolha opções e adicione
            </DrawerDescription>
          </DrawerHeader>
          {quickViewProduct ? (
            <div className="min-h-0 flex-1 px-5 pb-5 pt-1">
              <QuickViewBody product={quickViewProduct} onClose={closeQuickView} />
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeQuickView()}>
      <DialogContent
        className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-hidden border-[#E8D5C4] bg-[#FAF7F2] p-6 sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader className="space-y-2 overflow-visible pr-8 text-left">
          <DialogTitle
            className="text-xl leading-snug text-[#3D2B1F]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Visualização rápida
          </DialogTitle>
          <DialogDescription
            className="text-sm leading-normal text-[#8B6F5E]"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Passe as fotos · escolha opções e adicione
          </DialogDescription>
        </DialogHeader>
        {quickViewProduct ? (
          <QuickViewBody product={quickViewProduct} onClose={closeQuickView} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
