import {
  cartAddItemSchema,
  cartApplyCouponSchema,
  cartUpdateItemSchema,
} from "@shared/schemas/cart";
import { Router } from "express";
import {
  addCartItem,
  applyCartCoupon,
  clearCart,
  getCart,
  mergeGuestCartIntoCustomer,
  removeCartItem,
  updateCartItemQuantity,
} from "../services/cart";
import {
  requireCustomerForMerge,
  resolveCartIdentity,
  type CartRequest,
} from "../middleware/resolveCartIdentity";
import { clearCartSessionCookie } from "../lib/cartSession";

const router = Router();

router.use(resolveCartIdentity);

router.get("/", async (req: CartRequest, res) => {
  try {
    const cart = await getCart(req.cartIdentity!);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar carrinho",
    });
  }
});

router.post("/items", async (req: CartRequest, res) => {
  try {
    const parsed = cartAddItemSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const cart = await addCartItem(req.cartIdentity!, parsed.data);
    res.json(cart);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao adicionar item";
    const status = message.includes("não encontrado") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

router.patch("/items/:itemId", async (req: CartRequest, res) => {
  try {
    const parsed = cartUpdateItemSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const cart = await updateCartItemQuantity(req.cartIdentity!, req.params.itemId, parsed.data);
    res.json(cart);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar item";
    const status = message.includes("não encontrado") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

router.delete("/items/:itemId", async (req: CartRequest, res) => {
  try {
    const cart = await removeCartItem(req.cartIdentity!, req.params.itemId);
    res.json(cart);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover item";
    const status = message.includes("não encontrado") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

router.delete("/", async (req: CartRequest, res) => {
  try {
    const cart = await clearCart(req.cartIdentity!);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao esvaziar carrinho",
    });
  }
});

router.patch("/coupon", async (req: CartRequest, res) => {
  try {
    const parsed = cartApplyCouponSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const cart = await applyCartCoupon(req.cartIdentity!, parsed.data);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao salvar cupom",
    });
  }
});

router.post("/merge", requireCustomerForMerge, async (req: CartRequest, res) => {
  try {
    const customerId = req.cartIdentity!.customerId!;
    const guestSessionId = req.cartIdentity!.sessionId;

    const cart = await mergeGuestCartIntoCustomer(customerId, guestSessionId);
    clearCartSessionCookie(res);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao unificar carrinho",
    });
  }
});

export default router;
