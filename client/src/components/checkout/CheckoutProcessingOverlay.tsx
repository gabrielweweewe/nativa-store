import { Check, CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export default function CheckoutProcessingOverlay() {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => setConfirming(true), 4500);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2A1C14]/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-processing-title"
      aria-live="polite"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-[#FFFCF8] p-6 shadow-[0_30px_100px_rgba(42,28,20,.3)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-[#E8821A]/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 size-56 rounded-full bg-[#2D6A4F]/10 blur-3xl" />

        <div className="relative">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[#C4522A] to-[#E8821A] shadow-[0_12px_35px_rgba(196,82,42,.28)]">
            <div className="absolute size-20 animate-ping rounded-full border border-[#C4522A]/25 [animation-duration:2s]" />
            <CreditCard className="size-8 text-white" />
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C4522A]">
              Pagamento seguro
            </p>
            <h2
              id="checkout-processing-title"
              className="mt-2 text-2xl font-bold text-[#3D2B1F]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {confirming
                ? "Confirmando seu pagamento"
                : "Processando os dados do cartão"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#765746]">
              Aguarde só mais um instante. Não feche ou atualize esta página.
            </p>
          </div>

          <div className="mt-7 space-y-3 rounded-2xl border border-[#E8D5C4] bg-white/80 p-4">
            <StatusRow
              icon={LockKeyhole}
              label="Dados enviados com segurança"
              state="done"
            />
            <StatusRow
              icon={ShieldCheck}
              label="Autorização do Mercado Pago"
              state={confirming ? "done" : "active"}
            />
            <StatusRow
              icon={Check}
              label="Confirmação do pedido"
              state={confirming ? "active" : "waiting"}
            />
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#8B6F5E]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#2D6A4F]" />
            Ambiente protegido e criptografado
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  state,
}: {
  icon: typeof Check;
  label: string;
  state: "done" | "active" | "waiting";
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          state === "done"
            ? "bg-[#2D6A4F]/12 text-[#2D6A4F]"
            : state === "active"
              ? "bg-[#C4522A]/10 text-[#C4522A]"
              : "bg-[#F2E9E0] text-[#A88D7A]"
        }`}
      >
        {state === "active" ? (
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : (
          <Icon className="size-4" />
        )}
      </span>
      <span
        className={`text-sm ${
          state === "waiting"
            ? "text-[#A88D7A]"
            : "font-semibold text-[#3D2B1F]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
