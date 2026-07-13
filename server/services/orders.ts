import { CART_STATUS_ACTIVE } from "@shared/const/cart";
import { VISIBLE_ORDER_FILTER } from "@shared/const/order";
import type { CartItemRow, CartRow } from "@shared/lib/cartMapper";
import {
  mapCartItemToOrderItemPayload,
  mapOrderItemRowToOrderItem,
  mapOrderRowToOrder,
  mapOrderRowToSummary,
  type OrderRow,
} from "@shared/lib/orderMapper";
import type { CheckoutInput } from "@shared/schemas/order";
import type { CheckoutPaymentResult } from "@shared/types/mercadoPago";
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  CheckoutResponse,
  Order,
  OrderSummary,
} from "@shared/types/order";
import { supabase } from "../lib/supabase";
import {
  createMercadoPagoOrder,
  getActiveMercadoPagoEnvironment,
  getMercadoPagoOrder,
  mercadoPagoOrderIdentity,
} from "./mercadoPago";
import {
  ensurePaidOrderInMelhorEnvioCart,
  validateShippingSelection,
} from "./melhorEnvio";

async function fetchCustomerCartRow(
  customerId: string
): Promise<CartRow | null> {
  const { data, error } = await supabase
    .from("carts")
    .select("*")
    .eq("customer_id", customerId)
    .eq("status", CART_STATUS_ACTIVE)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CartRow | null;
}

async function fetchCartItems(cartId: string): Promise<CartItemRow[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CartItemRow[];
}

async function validateCheckoutStock(items: CartItemRow[]): Promise<void> {
  const productIds = Array.from(new Set(items.map(item => item.product_id)));
  const { data, error } = await supabase
    .from("products")
    .select("id, name, in_stock, stock_count")
    .in("id", productIds);
  if (error) throw new Error(error.message);

  const products = new Map(
    (data ?? []).map(product => [Number(product.id), product])
  );
  const requested = new Map<number, { quantity: number; name: string }>();
  for (const item of items) {
    const id = Number(item.product_id);
    const current = requested.get(id);
    requested.set(id, {
      quantity: (current?.quantity ?? 0) + item.quantity,
      name: item.product_name,
    });
  }
  for (const [id, item] of Array.from(requested.entries())) {
    const product = products.get(id);
    if (
      !product ||
      !product.in_stock ||
      Number(product.stock_count) < item.quantity
    ) {
      throw new Error(`Estoque insuficiente para ${item.name}`);
    }
  }
}

async function fetchOrderWithItems(
  orderId: string,
  customerId?: string
): Promise<Order> {
  let query = supabase.from("orders").select("*").eq("id", orderId);
  if (customerId) query = query.eq("customer_id", customerId);

  const { data: orderRow, error: orderError } = await query.single();

  if (orderError) throw new Error(orderError.message);

  const { data: itemRows, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("id", { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  const items = (itemRows ?? []).map(mapOrderItemRowToOrderItem);
  return mapOrderRowToOrder(orderRow as OrderRow, items);
}

export async function listCustomerOrders(
  customerId: string
): Promise<OrderSummary[]> {
  const { data: orderRows, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .or(VISIBLE_ORDER_FILTER)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!orderRows?.length) return [];

  const orderIds = orderRows.map(row => row.id);
  const { data: itemRows, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id, quantity")
    .in("order_id", orderIds);

  if (itemsError) throw new Error(itemsError.message);

  const countMap = new Map<string, number>();
  for (const item of itemRows ?? []) {
    const current = countMap.get(item.order_id) ?? 0;
    countMap.set(item.order_id, current + Number(item.quantity));
  }

  return orderRows.map(row =>
    mapOrderRowToSummary(row as OrderRow, countMap.get(row.id) ?? 0)
  );
}

export async function getCustomerOrder(
  customerId: string,
  orderId: string
): Promise<Order> {
  let order = await fetchOrderWithItems(orderId, customerId);
  // Reconcilia mesmo com instruções (Pix/boleto), senão o polling do checkout
  // nunca detecta o pagamento aprovado quando o webhook falha.
  if (
    order.paymentStatus === "pending" ||
    order.paymentStatus === "processing"
  ) {
    const { data: row } = await supabase
      .from("orders")
      .select("mercado_pago_order_id")
      .eq("id", orderId)
      .eq("customer_id", customerId)
      .maybeSingle();
    if (row?.mercado_pago_order_id) {
      try {
        const { data: attempt } = await supabase
          .from("payment_attempts")
          .select("environment")
          .eq("order_id", orderId)
          .maybeSingle();
        const payload = await getMercadoPagoOrder(
          row.mercado_pago_order_id,
          attempt?.environment as "test" | "production" | undefined
        );
        const identity = mercadoPagoOrderIdentity(payload);
        await supabase.rpc("reconcile_mercado_pago_payment", {
          p_mercado_pago_order_id: identity.orderId,
          p_mercado_pago_payment_id: identity.paymentId,
          p_payment_status: identity.status,
          p_status_detail: identity.statusDetail,
          p_response: payload,
        });
        if (identity.status === "approved") {
          try {
            await ensurePaidOrderInMelhorEnvioCart(orderId);
          } catch (shippingError) {
            console.error("Erro ao preparar etiqueta Melhor Envio:", shippingError);
          }
        }
        if (identity.instructions) {
          await supabase
            .from("orders")
            .update({
              payment_instructions: identity.instructions,
              payment_expires_at: identity.instructions.expirationDate ?? null,
            })
            .eq("id", orderId);
        }
        order = await fetchOrderWithItems(orderId, customerId);
      } catch (error) {
        console.error("Erro ao atualizar pagamento pendente:", error);
      }
    }
  }
  return order;
}

export async function createOrderFromCheckout(
  customerId: string,
  input: CheckoutInput
): Promise<CheckoutResponse> {
  const { data: existingAttempt, error: attemptError } = await supabase
    .from("payment_attempts")
    .select(
      "order_id, status, status_detail, mercado_pago_order_id, environment"
    )
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (attemptError) throw new Error(attemptError.message);
  let order: Order;
  let paymentEnvironment: "test" | "production";

  if (existingAttempt) {
    const existingOrder = await fetchOrderWithItems(existingAttempt.order_id);
    if (existingOrder.customerId !== customerId)
      throw new Error("Chave idempotente inválida");
    if (
      existingOrder.shippingQuoteId !== input.shipping.quoteId ||
      existingOrder.shippingServiceId !== input.shipping.serviceId
    ) {
      throw new Error("A entrega mudou. Gere uma nova tentativa de pagamento.");
    }
    if (
      existingAttempt.mercado_pago_order_id ||
      existingOrder.paymentStatus !== "pending" ||
      existingOrder.paymentInstructions
    ) {
      const payment: CheckoutPaymentResult = {
        outcome:
          existingOrder.paymentStatus === "approved"
            ? "approved"
            : existingOrder.paymentStatus === "rejected"
              ? "rejected"
              : "pending",
        orderId: existingOrder.id,
        paymentStatus: existingOrder.paymentStatus,
        statusDetail: existingOrder.paymentStatusDetail,
        instructions: existingOrder.paymentInstructions,
      };
      return { success: true, order: existingOrder, payment };
    }
    order = existingOrder;
    paymentEnvironment = existingAttempt.environment as "test" | "production";
  } else {
    const cartRow = await fetchCustomerCartRow(customerId);
    if (!cartRow) throw new Error("Carrinho vazio");

    const cartItems = await fetchCartItems(cartRow.id);
    if (cartItems.length === 0) throw new Error("Carrinho vazio");
    await validateCheckoutStock(cartItems);

    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.unit_price) * item.quantity,
      0
    );
    const selectedShipping = await validateShippingSelection({
      customerId,
      cartId: cartRow.id,
      quoteId: input.shipping.quoteId,
      serviceId: input.shipping.serviceId,
      toPostalCode: input.shippingAddress.cep,
      subtotal,
      items: cartItems,
    });
    const shippingAmount = selectedShipping.chargedPrice;
    const itemsPayload = cartItems.map(mapCartItemToOrderItemPayload);
    const environment = await getActiveMercadoPagoEnvironment();
    paymentEnvironment = environment;
    const { data, error } = await supabase.rpc(
      "checkout_create_payment_order",
      {
        p_customer_id: customerId,
        p_cart_id: cartRow.id,
        p_total_amount: subtotal + shippingAmount,
        p_shipping_amount: shippingAmount,
        p_coupon_code: cartRow.coupon_code,
        p_shipping_address: input.shippingAddress,
        p_payment_method: input.paymentMethod,
        p_items: itemsPayload,
        p_idempotency_key: input.idempotencyKey,
        p_environment: environment,
        p_shipping_quote_id: selectedShipping.quoteId,
        p_shipping_service_id: selectedShipping.service.id,
        p_shipping_service_name: selectedShipping.service.name,
        p_shipping_company: selectedShipping.service.company,
        p_shipping_delivery_days: selectedShipping.service.customDeliveryTime,
        p_shipping_environment: selectedShipping.environment,
        p_shipping_quote_snapshot: selectedShipping.snapshot,
        p_shipping_recipient: input.recipient,
      }
    );
    if (error) {
      if (error.code === "23505") {
        return createOrderFromCheckout(customerId, input);
      }
      throw new Error(error.message);
    }
    order = await fetchOrderWithItems((data as OrderRow).id);
  }

  const customer = await fetchCustomerInfo(customerId);
  if (!customer.email) throw new Error("Cliente sem e-mail para pagamento");

  try {
    const created = await createMercadoPagoOrder({
      order,
      checkout: input,
      payer: { email: customer.email, firstName: customer.name ?? undefined },
      environment: paymentEnvironment,
    });
    const identity = mercadoPagoOrderIdentity(created.raw);

    if (created.result.outcome === "rejected") {
      await Promise.all([
        supabase
          .from("orders")
          .update({
            mercado_pago_order_id: identity.orderId || null,
            mercado_pago_payment_id: identity.paymentId,
            payment_status: "rejected",
            payment_status_detail: identity.statusDetail,
          })
          .eq("id", order.id),
        supabase
          .from("payment_attempts")
          .update({
            mercado_pago_order_id: identity.orderId || null,
            mercado_pago_payment_id: identity.paymentId,
            status: "rejected",
            status_detail: identity.statusDetail,
            response_payload: created.raw,
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", order.id),
      ]);
    } else {
      const { error: acceptError } = await supabase.rpc(
        "checkout_accept_payment",
        {
          p_order_id: order.id,
          p_mercado_pago_order_id: identity.orderId,
          p_mercado_pago_payment_id: identity.paymentId,
          p_payment_status: identity.status,
          p_status_detail: identity.statusDetail,
          p_expires_at: identity.instructions?.expirationDate ?? null,
          p_instructions: identity.instructions,
          p_response: created.raw,
        }
      );
      if (acceptError) throw new Error(acceptError.message);

      if (identity.status === "approved") {
        const { error: reconcileError } = await supabase.rpc(
          "reconcile_mercado_pago_payment",
          {
            p_mercado_pago_order_id: identity.orderId,
            p_mercado_pago_payment_id: identity.paymentId,
            p_payment_status: identity.status,
            p_status_detail: identity.statusDetail,
            p_response: created.raw,
          }
        );
        if (reconcileError) throw new Error(reconcileError.message);
        try {
          await ensurePaidOrderInMelhorEnvioCart(order.id);
        } catch (shippingError) {
          console.error("Erro ao preparar etiqueta Melhor Envio:", shippingError);
        }
      }
    }

    return {
      success: true,
      order: await fetchOrderWithItems(order.id),
      payment: created.result,
    };
  } catch (error) {
    const payload = (error as Error & { payload?: unknown }).payload;
    await supabase
      .from("payment_attempts")
      .update({
        error_payload: payload ?? {
          message: error instanceof Error ? error.message : "Erro",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", order.id);
    throw error;
  }
}

async function fetchCustomerInfo(customerId: string | null): Promise<{
  name: string | null;
  email: string | null;
  phone: string | null;
}> {
  if (!customerId) {
    return { name: null, email: null, phone: null };
  }

  const [{ data: profile }, { data: authData }] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("full_name, phone")
      .eq("id", customerId)
      .maybeSingle(),
    supabase.auth.admin.getUserById(customerId),
  ]);

  return {
    name: profile?.full_name ? String(profile.full_name) : null,
    email: authData?.user?.email ?? null,
    phone: profile?.phone == null ? null : String(profile.phone),
  };
}

async function buildItemCountMap(
  orderIds: string[]
): Promise<Map<string, number>> {
  const countMap = new Map<string, number>();
  if (!orderIds.length) return countMap;

  const { data: itemRows, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id, quantity")
    .in("order_id", orderIds);

  if (itemsError) throw new Error(itemsError.message);

  for (const item of itemRows ?? []) {
    const current = countMap.get(item.order_id) ?? 0;
    countMap.set(item.order_id, current + Number(item.quantity));
  }

  return countMap;
}

export async function listAllOrders(): Promise<AdminOrderSummary[]> {
  const { data: orderRows, error } = await supabase
    .from("orders")
    .select("*")
    .or(VISIBLE_ORDER_FILTER)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!orderRows?.length) return [];

  const orderIds = orderRows.map(row => row.id);
  const countMap = await buildItemCountMap(orderIds);

  const customerIds = Array.from(
    new Set(orderRows.map(row => row.customer_id).filter(Boolean))
  ) as string[];
  const customerInfoMap = new Map<
    string,
    { name: string | null; email: string | null }
  >();

  await Promise.all(
    customerIds.map(async customerId => {
      const info = await fetchCustomerInfo(customerId);
      customerInfoMap.set(customerId, { name: info.name, email: info.email });
    })
  );

  return orderRows.map(row => {
    const summary = mapOrderRowToSummary(
      row as OrderRow,
      countMap.get(row.id) ?? 0
    );
    const customerInfo = row.customer_id
      ? customerInfoMap.get(row.customer_id)
      : undefined;

    return {
      ...summary,
      customerId: row.customer_id,
      customerName: customerInfo?.name ?? null,
      customerEmail: customerInfo?.email ?? null,
    };
  });
}

export async function getOrderById(orderId: string): Promise<AdminOrderDetail> {
  const order = await fetchOrderWithItems(orderId);
  const [customerInfo, shipmentResult] = await Promise.all([
    fetchCustomerInfo(order.customerId),
    supabase
      .from("melhor_envio_shipments")
      .select(
        "id, volume_index, status, melhor_envio_cart_id, error_message, attempt_count"
      )
      .eq("order_id", orderId)
      .order("volume_index", { ascending: true }),
  ]);
  if (shipmentResult.error) throw new Error(shipmentResult.error.message);

  return {
    ...order,
    customerName: customerInfo.name,
    customerEmail: customerInfo.email,
    customerPhone: customerInfo.phone,
    shipments: (shipmentResult.data ?? []).map(shipment => ({
      id: shipment.id,
      volumeIndex: Number(shipment.volume_index),
      status: shipment.status,
      melhorEnvioCartId: shipment.melhor_envio_cart_id,
      errorMessage: shipment.error_message,
      attemptCount: Number(shipment.attempt_count),
    })),
  };
}

export async function updateOrderStatus(
  orderId: string,
  status: Order["status"]
): Promise<AdminOrderDetail> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Pedido não encontrado");

  return getOrderById(orderId);
}
