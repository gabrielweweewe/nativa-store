import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

const STORAGE_KEY = "nativa-wishlist-slugs";

interface WishlistContextType {
  slugs: string[];
  count: number;
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (slug: string, productName?: string) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

function readStoredSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>(() => readStoredSlugs());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  }, [slugs]);

  const isFavorite = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggleFavorite = useCallback((slug: string, productName?: string) => {
    setSlugs((prev) => {
      const exists = prev.includes(slug);
      return exists ? prev.filter((s) => s !== slug) : [slug, ...prev];
    });
    const exists = slugs.includes(slug);
    toast.success(
      exists ? "Removido dos favoritos" : "Salvo nos favoritos!",
      productName ? { description: productName } : undefined,
    );
  }, [slugs]);

  const clearWishlist = useCallback(() => setSlugs([]), []);

  const value = useMemo<WishlistContextType>(
    () => ({
      slugs,
      count: slugs.length,
      isFavorite,
      toggleFavorite,
      clearWishlist,
    }),
    [slugs, isFavorite, toggleFavorite, clearWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist deve ser usado dentro de WishlistProvider");
  }
  return context;
}
