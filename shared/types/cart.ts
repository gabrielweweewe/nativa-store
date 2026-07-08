export type CartStatus = "active" | "converted";

export interface CartItem {
  id: string;
  cartId: string;
  productId: number;
  quantity: number;
  sizeLabel: string;
  colorName: string;
  unitPrice: number;
  productName: string;
  productSlug: string;
  productImage: string;
  productSku: string;
  lineTotal: number;
  inStock: boolean;
  stockCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  freeShippingThreshold: number;
  freeShippingRemaining: number;
  qualifiesForFreeShipping: boolean;
}

export interface Cart {
  id: string;
  customerId: string | null;
  sessionId: string | null;
  status: CartStatus;
  couponCode: string | null;
  items: CartItem[];
  summary: CartSummary;
  createdAt: string;
  updatedAt: string;
}

/** Payload exportável para checkout (próxima iteração). */
export interface CartCheckoutPayload {
  cartId: string;
  couponCode: string | null;
  items: CartItem[];
  summary: CartSummary;
}
