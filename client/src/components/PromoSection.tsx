/**
 * Nativa Store — Promo Banner + Newsletter Section
 * Design: Brasil Vivo — Artesanato com Alma
 * Full-width promo with tropical pattern background + email signup
 */

import { useState } from "react";
import { toast } from "sonner";
import { FeatherOrange, FeatherBlue, FeatherGreen } from "./NativaDecorations";

export default function PromoSection() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !consent || status === "loading") return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          consent: true,
          website,
          source: "home_newsletter",
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Não foi possível concluir sua inscrição.");
      }
      setStatus("success");
      setEmail("");
      setConsent(false);
      toast.success("Inscrição confirmada!", {
        description: "Você receberá novidades e ofertas exclusivas.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível concluir sua inscrição.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  return (
    <section
      id="novidades"
      className="py-20 relative overflow-hidden"
      style={{ background: "#FAF7F2" }}
    >
      {/* Decorative feathers */}
      <div className="absolute top-8 left-[5%] feather-float opacity-30">
        <FeatherOrange className="w-7 h-16 rotate-[-30deg]" />
      </div>
      <div className="absolute top-20 right-[8%] feather-float-delay opacity-25">
        <FeatherBlue className="w-6 h-14 rotate-[25deg]" />
      </div>
      <div className="absolute bottom-10 left-[12%] feather-float-delay2 opacity-30">
        <FeatherGreen className="w-5 h-12 rotate-[10deg]" />
      </div>

      <div className="container">
        {/* Promo banner */}
        <div
          className="rounded-3xl overflow-hidden mb-16 relative"
          style={{
            background: "linear-gradient(135deg, #2D6A4F 0%, #1B7A8C 50%, #2D6A4F 100%)",
            boxShadow: "0 20px 60px oklch(0.42 0.1 155 / 0.3)",
          }}
        >
          {/* Pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div
                className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-3"
                style={{
                  background: "rgba(255,255,255,0.2)",
                  fontFamily: "'Nunito', sans-serif",
                  letterSpacing: "0.08em",
                }}
              >
                🔥 OFERTA ESPECIAL
              </div>
              <h3
                className="text-3xl md:text-4xl font-bold text-white mb-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Primeira compra com<br />
                <span style={{ color: "#F5D78A" }}>15% de desconto</span>
              </h3>
              <p
                className="text-white/80 text-sm"
                style={{ fontFamily: "'Lora', serif" }}
              >
                Use o código <strong className="text-white">NATIVA15</strong> no checkout
              </p>
            </div>

            <button
              onClick={() => toast("Código copiado: NATIVA15", { description: "Use no seu próximo pedido!" })}
              className="flex-shrink-0 px-8 py-3.5 rounded-full font-bold text-sm transition-all duration-200 hover:shadow-xl hover:-translate-y-1 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #C4522A, #E8821A)",
                color: "white",
                fontFamily: "'Nunito', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              Copiar Código
            </button>
          </div>
        </div>

        {/* Newsletter */}
        <div className="text-center max-w-xl mx-auto">
          <div className="text-3xl mb-3">🌺</div>
          <h3
            className="text-3xl font-bold mb-3"
            style={{
              fontFamily: "'Playfair Display', serif",
              background: "linear-gradient(135deg, #C4522A, #E8821A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Receba novidades em primeira mão
          </h3>
          <p
            className="text-[#8B6F5E] mb-8 text-sm"
            style={{ fontFamily: "'Lora', serif", fontStyle: "italic" }}
          >
            Inscreva-se e seja a primeira a saber sobre novas coleções, promoções exclusivas e histórias das nossas artesãs.
          </p>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== "loading") setStatus("idle");
                }}
                placeholder="seu@email.com"
                aria-label="Seu e-mail"
                className="min-w-0 flex-1 px-5 py-3 rounded-full border border-[#C4522A]/25 bg-white text-[#3D2B1F] text-sm outline-none focus:border-[#C4522A]/60 focus:ring-2 focus:ring-[#C4522A]/15 transition-all duration-200"
                style={{ fontFamily: "'Lora', serif" }}
              />
              <button
                type="submit"
                disabled={status === "loading" || !consent}
                className="nativa-btn-primary px-6 py-3 rounded-full text-sm whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "loading" ? "Inscrevendo..." : "Inscrever-se"}
              </button>
            </div>
            <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">
              <label htmlFor="newsletter-website">Não preencha este campo</label>
              <input
                id="newsletter-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={event => setWebsite(event.target.value)}
              />
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-left text-xs text-[#8B6F5E]">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={event => setConsent(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[#C4522A]"
              />
              <span>
                Concordo em receber novidades, promoções e conteúdos da Nativa
                por e-mail. Posso cancelar a qualquer momento.
              </span>
            </label>
            <div aria-live="polite" className="mt-2 min-h-5 text-xs">
              {status === "success" && (
                <p className="font-semibold text-[#2D6A4F]">
                  Inscrição realizada com sucesso!
                </p>
              )}
              {status === "error" && (
                <p className="font-semibold text-red-700">{errorMessage}</p>
              )}
            </div>
          </form>

          <p
            className="text-xs text-[#B0A090] mt-1"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Sem spam. Cancele quando quiser.
          </p>
        </div>
      </div>
    </section>
  );
}
