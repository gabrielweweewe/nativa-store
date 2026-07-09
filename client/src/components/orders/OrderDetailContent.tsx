import { formatPrice } from "@/lib/products";
import { formatAddressLine, formatCepDisplay } from "@shared/types/address";
import { PAYMENT_METHOD_LABELS } from "@shared/lib/orderLabels";
import type { Order, PaymentMethod } from "@shared/types/order";
import { Barcode, CreditCard, MapPin, QrCode, Truck } from "lucide-react";
import { Link } from "wouter";

function PaymentIcon({ method }: { method: PaymentMethod }) {
  if (method === "pix") return <QrCode size={14} />;
  if (method === "credit_card") return <CreditCard size={14} />;
  return <Barcode size={14} />;
}

interface OrderDetailContentProps {
  order: Order;
  productLinkPrefix?: string;
}

export default function OrderDetailContent({
  order,
  productLinkPrefix = "/produto",
}: OrderDetailContentProps) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-[#FAF7F2] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3D2B1F]">
            <MapPin size={15} className="text-[#C4522A]" />
            Endereço de entrega
          </div>
          <p
            className="text-sm leading-relaxed text-[#8B6F5E]"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            {formatAddressLine(order.shippingAddress)}
          </p>
          <p className="mt-1 text-xs text-[#8B6F5E]">
            CEP {formatCepDisplay(order.shippingAddress.cep)}
          </p>
        </div>

        <div className="rounded-xl bg-[#FAF7F2] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3D2B1F]">
            <PaymentIcon method={order.paymentMethod} />
            Pagamento
          </div>
          <p className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {PAYMENT_METHOD_LABELS[order.paymentMethod]}
          </p>
          {order.couponCode && (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#C4522A]">
              Cupom: {order.couponCode}
            </p>
          )}
        </div>
      </div>

      <div>
        <p
          className="mb-3 text-sm font-semibold text-[#3D2B1F]"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          Itens do pedido
        </p>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-xl border border-[#E8D5C4]/80 bg-white p-3"
            >
              <img
                src={item.image}
                alt={item.name}
                className="h-16 w-14 shrink-0 rounded-lg border border-[#E8D5C4] object-cover"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`${productLinkPrefix}/${item.productSlug}`}
                  className="block truncate font-semibold text-[#3D2B1F] hover:text-[#C4522A]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {item.name}
                </Link>
                <p className="text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {item.quantity}x · {item.size}
                  {item.color ? ` · ${item.color}` : ""}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#C4522A]">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="rounded-xl border border-[#E8D5C4] bg-[#FFFCF8] p-4 text-sm"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        <div className="flex justify-between text-[#8B6F5E]">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="mt-2 flex justify-between text-[#8B6F5E]">
          <span className="flex items-center gap-1">
            <Truck size={14} />
            Frete
          </span>
          <span>{order.shippingAmount === 0 ? "Grátis" : formatPrice(order.shippingAmount)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-[#E8D5C4] pt-3 font-semibold text-[#3D2B1F]">
          <span>Total pago</span>
          <span style={{ fontFamily: "'Playfair Display', serif" }}>
            {formatPrice(order.totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
