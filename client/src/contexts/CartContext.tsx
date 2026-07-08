import {
  addCartItem as addCartItemApi,
  applyCartCoupon as applyCartCouponApi,
  clearCart as clearCartApi,
  fetchCart,
  mergeCart,
  removeCartItem as removeCartItemApi,
  updateCartItem as updateCartItemApi,
} from "@/lib/cartApi";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { buildCartSummary } from "@shared/lib/cartMapper";
import type { CartAddItemInput, CartApplyCouponInput } from "@shared/schemas/cart";
import type { Cart, CartItem, CartSummary } from "@shared/types/cart";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

const EMPTY_SUMMARY: CartSummary = {
  itemCount: 0,
  subtotal: 0,
  freeShippingThreshold: 299,
  freeShippingRemaining: 299,
  qualifiesForFreeShipping: false,
};

interface CartContextType {
  cart: Cart | null;
  items: CartItem[];
  summary: CartSummary;
  itemCount: number;
  couponCode: string | null;
  isLoading: boolean;
  isUpdating: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  refreshCart: () => Promise<void>;
  addItem: (input: CartAddItemInput) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  applyCoupon: (input: CartApplyCouponInput) => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function applyCartState(setCart: (cart: Cart) => void, cart: Cart) {
  setCart(cart);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { session, user, isLoading: authLoading } = useCustomerAuth();
  const token = session?.access_token ?? null;

  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const mergedForUserRef = useRef<string | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  const loadCart = useCallback(async () => {
    try {
      const data = await fetchCart(token);
      applyCartState(setCart, data);
    } catch (error) {
      toast.error("Erro ao carregar carrinho", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    }
  }, [token]);

  const refreshCart = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadCart();
    } finally {
      setIsLoading(false);
    }
  }, [loadCart]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function init() {
      setIsLoading(true);

      try {
        if (user && token && mergedForUserRef.current !== user.id) {
          mergedForUserRef.current = user.id;
          try {
            const data = await mergeCart(token);
            if (!cancelled) {
              applyCartState(setCart, data);
            }
          } catch {
            mergedForUserRef.current = null;
            throw new Error("merge failed");
          }
        } else {
          const data = await fetchCart(token);
          if (!cancelled) {
            applyCartState(setCart, data);
          }
        }
      } catch (error) {
        if (!cancelled) {
          toast.error("Erro ao carregar carrinho", {
            description: error instanceof Error ? error.message : "Tente novamente",
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    const userChanged = prevUserIdRef.current !== (user?.id ?? null);
    prevUserIdRef.current = user?.id ?? null;

    if (!user) {
      mergedForUserRef.current = null;
    }

    if (userChanged || !cart) {
      init();
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token]);

  const items = cart?.items ?? [];
  const summary = cart?.summary ?? EMPTY_SUMMARY;
  const itemCount = summary.itemCount;
  const couponCode = cart?.couponCode ?? null;

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((v) => !v), []);

  const addItem = useCallback(
    async (input: CartAddItemInput) => {
      setIsUpdating(true);
      try {
        const data = await addCartItemApi(input, token);
        applyCartState(setCart, data);
        return true;
      } catch (error) {
        toast.error("Não foi possível adicionar", {
          description: error instanceof Error ? error.message : "Tente novamente",
        });
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [token],
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const previousItems = items;
      const optimisticItems = previousItems.map((item) =>
        item.id === itemId
          ? { ...item, quantity, lineTotal: item.unitPrice * quantity }
          : item,
      );

      if (cart) {
        setCart({
          ...cart,
          items: optimisticItems,
          summary: buildCartSummary(optimisticItems),
        });
      }

      setIsUpdating(true);
      try {
        const data = await updateCartItemApi(itemId, { quantity }, token);
        applyCartState(setCart, data);
        return true;
      } catch (error) {
        if (cart) {
          setCart({ ...cart, items: previousItems, summary: buildCartSummary(previousItems) });
        }
        toast.error("Erro ao atualizar quantidade", {
          description: error instanceof Error ? error.message : "Tente novamente",
        });
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [cart, items, token],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      setIsUpdating(true);
      try {
        const data = await removeCartItemApi(itemId, token);
        applyCartState(setCart, data);
        toast.success("Item removido do carrinho");
        return true;
      } catch (error) {
        toast.error("Erro ao remover item", {
          description: error instanceof Error ? error.message : "Tente novamente",
        });
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [token],
  );

  const clearCart = useCallback(async () => {
    setIsUpdating(true);
    try {
      const data = await clearCartApi(token);
      applyCartState(setCart, data);
      toast.success("Carrinho esvaziado");
      return true;
    } catch (error) {
      toast.error("Erro ao esvaziar carrinho", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [token]);

  const applyCoupon = useCallback(
    async (input: CartApplyCouponInput) => {
      setIsUpdating(true);
      try {
        const data = await applyCartCouponApi(input, token);
        applyCartState(setCart, data);
        toast.success("Cupom salvo", {
          description: "Será validado no checkout",
        });
        return true;
      } catch (error) {
        toast.error("Erro ao salvar cupom", {
          description: error instanceof Error ? error.message : "Tente novamente",
        });
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [token],
  );

  const value = useMemo<CartContextType>(
    () => ({
      cart,
      items,
      summary,
      itemCount,
      couponCode,
      isLoading,
      isUpdating,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      refreshCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      applyCoupon,
    }),
    [
      cart,
      items,
      summary,
      itemCount,
      couponCode,
      isLoading,
      isUpdating,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      refreshCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      applyCoupon,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart deve ser usado dentro de CartProvider");
  }
  return context;
}
