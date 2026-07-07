/**
 * Nativa Store — Navbar Component
 * Design: Brasil Vivo — Artesanato com Alma
 * Amendment: "The Nativa logo must always include the abstract agulha + pena 'N' symbol"
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Menu, X, Search, Heart } from "lucide-react";
import { toast } from "sonner";

// Custom SVG logo mark: agulha + pena forming abstract "N"
function NativaLogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Needle — diagonal from top-left to bottom-right */}
      <line x1="8" y1="6" x2="32" y2="34" stroke="#C4522A" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Needle eye */}
      <ellipse cx="9" cy="7" rx="3" ry="4" fill="#C4522A" opacity="0.9" transform="rotate(-45 9 7)"/>
      <ellipse cx="9" cy="7" rx="1.5" ry="2" fill="white" opacity="0.5" transform="rotate(-45 9 7)"/>
      {/* Thread */}
      <path d="M10 10 Q16 20 12 28" stroke="#E8821A" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8"/>
      {/* Feather — diagonal from top-right to bottom-left */}
      <path d="M32 6 C36 10, 36 18, 30 22 C24 26, 16 28, 12 34 C10 30, 14 24, 20 20 C26 16, 32 12, 32 6Z" fill="#2D6A4F" opacity="0.75"/>
      {/* Feather spine */}
      <line x1="32" y1="6" x2="12" y2="34" stroke="#1A4A35" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      {/* Feather color accents */}
      <path d="M28 10 C30 14, 28 18, 24 20" stroke="#52A87A" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M24 14 C26 18, 22 22, 18 24" stroke="#1B7A8C" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

const navLinks = [
  { label: "Coleções", href: "#colecoes" },
  { label: "Novidades", href: "#novidades" },
  { label: "Sobre Nós", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

export default function Navbar() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = location === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (!isHome) {
      window.location.href = `/${href}`;
      return;
    }
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#F5F0E8]/95 backdrop-blur-md shadow-sm border-b border-[#C4522A]/10"
            : "bg-transparent"
        }`}
      >
        <div className="container">
          <div className="flex items-center justify-between h-14 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <span className="md:hidden">
                <NativaLogoMark size={32} />
              </span>
              <span className="hidden md:block">
                <NativaLogoMark size={38} />
              </span>
              <span className="flex flex-col leading-none">
                <span
                  className="text-xl md:text-2xl font-bold italic tracking-tight"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    background: "linear-gradient(135deg, #C4522A 0%, #E8821A 40%, #2D6A4F 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Nativa
                </span>
                <span
                  className="hidden sm:block text-[0.6rem] uppercase tracking-[0.18em] text-[#8B6F5E]"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Liberdade em cada detalhe
                </span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                  className="text-sm font-medium text-[#3D2B1F] hover:text-[#C4522A] transition-colors duration-200"
                  style={{ fontFamily: "'Nunito', sans-serif", letterSpacing: "0.04em" }}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => toast("Busca em breve!", { description: "Funcionalidade sendo desenvolvida." })}
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#C4522A]/10 text-[#3D2B1F] hover:text-[#C4522A] transition-all duration-200"
                aria-label="Buscar"
              >
                <Search size={18} />
              </button>
              <button
                onClick={() => toast("Lista de desejos em breve!", { description: "Funcionalidade sendo desenvolvida." })}
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#C4522A]/10 text-[#3D2B1F] hover:text-[#C4522A] transition-all duration-200"
                aria-label="Favoritos"
              >
                <Heart size={18} />
              </button>
              <button
                onClick={() => toast("Carrinho em breve!", { description: "Funcionalidade sendo desenvolvida." })}
                className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#C4522A]/10 text-[#3D2B1F] hover:text-[#C4522A] transition-all duration-200"
                aria-label="Carrinho"
              >
                <ShoppingBag size={18} />
              </button>
              <button
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#C4522A]/10 text-[#3D2B1F] transition-all duration-200"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        <div
          className={`absolute top-0 right-0 h-full w-72 bg-[#F5F0E8] shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full pt-20 px-6 pb-8">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                  className="py-3 px-4 rounded-lg text-base font-semibold text-[#3D2B1F] hover:bg-[#C4522A]/10 hover:text-[#C4522A] transition-all duration-200"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto pt-6 border-t border-[#C4522A]/15">
              <p className="text-xs text-[#8B6F5E] text-center italic" style={{ fontFamily: "'Lora', serif" }}>
                "Liberdade em cada detalhe"
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
