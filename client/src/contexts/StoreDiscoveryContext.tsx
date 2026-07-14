import type { Product } from "@shared/types/product";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface StoreDiscoveryContextType {
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  quickViewProduct: Product | null;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;
}

const StoreDiscoveryContext = createContext<StoreDiscoveryContextType | undefined>(undefined);

export function StoreDiscoveryProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const toggleSearch = useCallback(() => setIsSearchOpen((v) => !v), []);

  const openQuickView = useCallback((product: Product) => {
    setQuickViewProduct(product);
  }, []);
  const closeQuickView = useCallback(() => setQuickViewProduct(null), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
        return;
      }

      if (e.key === "/" && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo<StoreDiscoveryContextType>(
    () => ({
      isSearchOpen,
      openSearch,
      closeSearch,
      toggleSearch,
      quickViewProduct,
      openQuickView,
      closeQuickView,
    }),
    [
      isSearchOpen,
      openSearch,
      closeSearch,
      toggleSearch,
      quickViewProduct,
      openQuickView,
      closeQuickView,
    ],
  );

  return (
    <StoreDiscoveryContext.Provider value={value}>{children}</StoreDiscoveryContext.Provider>
  );
}

export function useStoreDiscovery() {
  const context = useContext(StoreDiscoveryContext);
  if (!context) {
    throw new Error("useStoreDiscovery deve ser usado dentro de StoreDiscoveryProvider");
  }
  return context;
}
