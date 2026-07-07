/**
 * Nativa Store — Navbar Component
 * Design: Brasil Vivo — Artesanato com Alma
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Menu, X, Search, Heart } from "lucide-react";
import { toast } from "sonner";
import NativaLogo from "./NativaLogo";

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
    handleScroll();
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
          <div className="relative flex items-center justify-end md:justify-between h-16 md:h-20">
            {/* Logo — desktop sempre visível */}
            <Link href="/" className="hidden md:block group shrink-0">
              <NativaLogo className="h-9 sm:h-10 md:h-11 w-auto" showTagline />
            </Link>

            {/* Logo — mobile: só ao rolar (header com fundo) */}
            <Link
              href="/"
              className={`md:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                scrolled
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
              aria-hidden={!scrolled}
            >
              <NativaLogo className="h-9 w-auto" />
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
            <div className="relative z-10 flex items-center gap-3">
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
