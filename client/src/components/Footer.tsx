/**
 * Nativa Store — Footer Component
 * Design: Brasil Vivo — Artesanato com Alma
 * Dark forest green footer with brand info, links and social
 */

import { toast } from "sonner";
import { Instagram, Facebook, Mail, MapPin, Phone } from "lucide-react";
import NativaLogo from "./NativaLogo";
import { WaveDividerDown } from "./NativaDecorations";
import { buildWhatsAppUrl, defaultWhatsAppMessage, WHATSAPP_DISPLAY } from "@/lib/whatsapp";

const FOOTER_BG = "#1A3D2B";

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.8a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52V6.79a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

const footerLinks = {
  loja: [
    { label: "Coleções", href: "#colecoes" },
    { label: "Novidades", href: "#novidades" },
    { label: "Promoções", href: "#" },
    { label: "Edições Limitadas", href: "#" },
  ],
  ajuda: [
    { label: "Como Comprar", href: "#" },
    { label: "Trocas e Devoluções", href: "#" },
    { label: "Frete e Entrega", href: "#" },
    { label: "Perguntas Frequentes", href: "#" },
  ],
  empresa: [
    { label: "Nossa História", href: "#sobre" },
    { label: "Artesãs Parceiras", href: "#" },
    { label: "Sustentabilidade", href: "#" },
    { label: "Trabalhe Conosco", href: "#" },
  ],
};

export default function Footer() {
  const handleLink = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (href.startsWith("#") && href.length > 1) {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    } else {
      toast("Em breve!", { description: "Esta página está sendo desenvolvida." });
    }
  };

  return (
    <>
      <WaveDividerDown color={FOOTER_BG} />
      <footer
        id="contato"
        style={{ background: FOOTER_BG }}
      >
      {/* Main footer content */}
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 text-center md:text-left">
          {/* Brand column */}
          <div className="lg:col-span-2 flex flex-col items-center md:items-start">
            <div className="mb-4">
              <NativaLogo className="h-12 sm:h-14 w-auto" taglineClassName="text-white/70" showTagline />
            </div>
            <p
              className="text-white/65 text-sm leading-relaxed mb-6 max-w-xs mx-auto md:mx-0"
              style={{ fontFamily: "'Lora', serif", fontStyle: "italic" }}
            >
              Peças autorais e exclusivas: bolsas artesanais feitas à mão para contar histórias brasileiras.
            </p>

            {/* Contact info */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-center md:justify-start gap-2 text-white/55">
                <span className="text-[#E8821A]">
                  <Mail size={14} />
                </span>
                <span className="text-xs" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  contato@nativa.com.br
                </span>
              </div>
              <a
                href={buildWhatsAppUrl(defaultWhatsAppMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-white/55 transition-colors hover:text-[#25D366] md:justify-start"
              >
                <span className="text-[#E8821A]">
                  <Phone size={14} />
                </span>
                <span className="text-xs" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {WHATSAPP_DISPLAY}
                </span>
              </a>
              <div className="flex items-center justify-center md:justify-start gap-2 text-white/55">
                <span className="text-[#E8821A]">
                  <MapPin size={14} />
                </span>
                <span className="text-xs" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  São Paulo, SP — Brasil
                </span>
              </div>
            </div>

            {/* Social links */}
            <div className="flex gap-3 justify-center md:justify-start">
              {[
                {
                  icon: <Instagram size={16} />,
                  label: "Instagram",
                  href: "https://www.instagram.com/nativa_criativa/",
                },
                {
                  icon: <Facebook size={16} />,
                  label: "Facebook",
                  href: "https://www.facebook.com/share/1BjeTNQpat/?mibextid=wwXIfr",
                },
                {
                  icon: <TikTokIcon size={16} />,
                  label: "TikTok",
                  href: "https://www.tiktok.com/@nativa.criativa?_r=1&_t=ZS-98HzhNyOEYj",
                },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section} className="flex flex-col items-center md:items-start">
              <h4
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  color: "#E8821A",
                }}
              >
                {section === "loja" ? "Loja" : section === "ajuda" ? "Ajuda" : "Empresa"}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => handleLink(e, link.href)}
                      className="text-sm text-white/55 hover:text-white/90 transition-colors duration-200"
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t py-5"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="container flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 text-center">
          <p
            className="text-xs text-white/35"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            © 2025 Nativa. Todos os direitos reservados. Feito com 🌿 no Brasil.
          </p>
          <div className="flex gap-4">
            {["Política de Privacidade", "Termos de Uso"].map((item) => (
              <button
                key={item}
                onClick={() => toast("Em breve!")}
                className="text-xs text-white/35 hover:text-white/60 transition-colors duration-200"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
    </>
  );
}
