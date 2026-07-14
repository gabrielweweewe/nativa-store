/**
 * Busca instantânea — drawer no mobile, dialog no desktop.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Search, X, ArrowRight } from "lucide-react";
import type { Product } from "@shared/types/product";
import { fetchProducts, formatPrice } from "@/lib/products";
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
import { Spinner } from "@/components/ui/spinner";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function filterProducts(products: Product[], query: string): Product[] {
  const q = normalize(query);
  if (!q) return products.slice(0, 8);

  return products
    .filter((p) => {
      const haystack = normalize(
        [p.name, p.category, p.sku, p.badge, p.shortDescription].join(" "),
      );
      return haystack.includes(q) || q.split(/\s+/).every((token) => haystack.includes(token));
    })
    .slice(0, 12);
}

function SearchResults({
  products,
  loading,
  query,
  onSelect,
}: {
  products: Product[];
  loading: boolean;
  query: string;
  onSelect: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-7 text-[#C4522A]" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="px-1 py-10 text-center">
        <p
          className="text-base font-semibold text-[#3D2B1F]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Nenhuma peça encontrada
        </p>
        <p className="mt-1 text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Tente outro nome, categoria ou SKU.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {products.map((product) => (
        <li key={product.id}>
          <Link
            href={`/produto/${product.slug}`}
            onClick={onSelect}
            className="flex items-center gap-3 rounded-2xl border border-transparent p-2 transition-colors hover:border-[#E8D5C4] hover:bg-white active:bg-white"
          >
            <img
              src={product.image}
              alt=""
              className="h-16 w-14 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider text-[#1B7A8C]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                {product.category}
              </p>
              <p
                className="truncate text-sm font-semibold text-[#3D2B1F]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {product.name}
              </p>
              <p
                className="text-sm font-bold text-[#C4522A]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                {formatPrice(product.price)}
              </p>
            </div>
            <ArrowRight size={16} className="shrink-0 text-[#C4522A]/70" />
          </Link>
        </li>
      ))}
      {!query.trim() && (
        <li className="pt-2 text-center text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Digite para filtrar · atalho{" "}
          <kbd className="rounded border border-[#E8D5C4] bg-white px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </li>
      )}
    </ul>
  );
}

function SearchPanel({
  query,
  setQuery,
  results,
  loading,
  onClose,
  inputRef,
}: {
  query: string;
  setQuery: (v: string) => void;
  results: Product[];
  loading: boolean;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative px-0.5 pb-4 pt-3">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-[calc(50%+0.125rem)] -translate-y-1/2 text-[#8B6F5E]"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar peças, bolsas, cores…"
          className="h-12 w-full rounded-2xl border border-[#E8D5C4] bg-white py-3 pl-11 pr-11 text-base text-[#3D2B1F] outline-none ring-[#C4522A]/30 placeholder:text-[#B0A090] focus:ring-2"
          style={{ fontFamily: "'Nunito', sans-serif" }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-[calc(50%+0.125rem)] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#8B6F5E] hover:bg-[#C4522A]/10 hover:text-[#C4522A]"
            aria-label="Limpar busca"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-2">
        <SearchResults
          products={results}
          loading={loading}
          query={query}
          onSelect={onClose}
        />
      </div>
    </div>
  );
}

export default function StoreSearch() {
  const { isSearchOpen, closeSearch } = useStoreDiscovery();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSearchOpen) {
      setQuery("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [isSearchOpen]);

  const results = useMemo(() => filterProducts(products, query), [products, query]);

  const panel = (
    <SearchPanel
      query={query}
      setQuery={setQuery}
      results={results}
      loading={loading}
      onClose={closeSearch}
      inputRef={inputRef}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        open={isSearchOpen}
        onOpenChange={(open) => !open && closeSearch()}
        shouldScaleBackground={false}
      >
        <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden border-[#E8D5C4] bg-[#FAF7F2]">
          <DrawerHeader className="gap-2.5 px-5 pb-1 pt-3 text-left">
            <DrawerTitle
              className="text-xl leading-snug text-[#3D2B1F]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Buscar na Nativa
            </DrawerTitle>
            <DrawerDescription
              className="pb-1 text-sm leading-relaxed text-[#8B6F5E]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Encontre peças por nome, categoria ou código
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {panel}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isSearchOpen} onOpenChange={(open) => !open && closeSearch()}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col gap-3 overflow-hidden border-[#E8D5C4] bg-[#FAF7F2] p-5 sm:max-w-lg"
      >
        <DialogHeader className="space-y-2 overflow-visible pr-8 text-left">
          <DialogTitle
            className="text-xl leading-snug text-[#3D2B1F]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Buscar na Nativa
          </DialogTitle>
          <DialogDescription
            className="text-sm leading-normal text-[#8B6F5E]"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Encontre peças por nome, categoria ou código
          </DialogDescription>
        </DialogHeader>
        {panel}
      </DialogContent>
    </Dialog>
  );
}
