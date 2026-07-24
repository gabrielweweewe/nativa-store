/**
 * Nativa Store — Navbar Component
 * Design: Brasil Vivo — Artesanato com Alma
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Menu, X, Search, Heart, UserRound } from "lucide-react";
import NativaLogo from "./NativaLogo";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useStoreDiscovery } from "@/contexts/StoreDiscoveryContext";

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
  const isAuthPage =
    location === "/entrar" ||
    location === "/cadastro" ||
    location === "/conta" ||
    location === "/recuperar-senha" ||
    location === "/redefinir-senha" ||
    location.startsWith("/verificar-email");
  const showSolidHeader = scrolled || !isHome || isAuthPage;
  const { user, isLoading } = useCustomerAuth();
  const { itemCount, openDrawer, cartPulse } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { openSearch } = useStoreDiscovery();

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
          showSolidHeader
            ? "bg-[#F5F0E8]/95 backdrop-blur-md shadow-sm border-b border-[#C4522A]/10"
            : "bg-transparent"
        }`}
      >
        <div className="container">
          <div className="relative flex items-center justify-between h-16 md:h-20">
            {/* Esquerda: menu mobile + logo desktop */}
            <div className="relative z-10 flex items-center gap-1">
              <button
                type="button"
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#C4522A]/10 text-[#3D2B1F] transition-all duration-200"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <Link href="/" className="hidden md:block group shrink-0">
                <NativaLogo className="h-9 sm:h-10 md:h-11 w-auto" showTagline />
              </Link>
            </div>

            {/* Logo — mobile: só ao rolar (header com fundo) */}
            <Link
              href="/"
              className={`md:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                showSolidHeader
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
              aria-hidden={!showSolidHeader}
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

            {/* Direita: busca, favoritos, carrinho (+ conta no desktop) */}
            <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 md:gap-3">
              {!isLoading && (
                <Link
                  href={user ? "/conta" : "/entrar"}
                  className="hidden md:flex items-center gap-2 rounded-full px-3 py-2 hover:bg-[#C4522A]/10 text-[#3D2B1F] hover:text-[#C4522A] transition-all duration-200"
                  aria-label={user ? "Minha conta" : "Entrar"}
                >
                  <UserRound size={18} />
                  <span
                    className="text-sm font-semibold"
                    style={{ fontFamily: "'Nunito', sans-serif", letterSpacing: "0.02em" }}
                  >
                    {user ? "Minha conta" : "Entrar"}
                  </span>
                </Link>
              )}
              <button
                type="button"
                onClick={openSearch}
                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#C4522A]/10 text-[#3D2B1F] hover:text-[#C4522A] transition-all duration-200"
                aria-label="Buscar"
              >
                <Search size={18} />
              </button>
              <Link
                href="/favoritos"
                className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#C4522A]/10 text-[#3D2B1F] hover:text-[#C4522A] transition-all duration-200"
                aria-label={`Favoritos${wishlistCount > 0 ? `, ${wishlistCount} itens` : ""}`}
              >
                <Heart size={18} className={wishlistCount > 0 ? "fill-[#C4522A]/20" : ""} />
                {wishlistCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #C4522A, #E8821A)" }}
                  >
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={openDrawer}
                className={`relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#C4522A]/10 text-[#3D2B1F] hover:text-[#C4522A] transition-all duration-200 ${
                  cartPulse > 0 ? "cart-icon-pulse" : ""
                }`}
                key={cartPulse > 0 ? `cart-pulse-${cartPulse}` : "cart-idle"}
                aria-label={`Carrinho${itemCount > 0 ? `, ${itemCount} itens` : ""}`}
              >
                <ShoppingBag size={18} />
                {itemCount > 0 && (
                  <span
                    className="cart-badge-bounce absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #C4522A, #E8821A)" }}
                    key={`badge-${cartPulse}-${itemCount}`}
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu — abre pela esquerda */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        <div
          className={`absolute top-0 left-0 h-full w-72 bg-[#F5F0E8] shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
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
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openSearch();
                }}
                className="flex items-center gap-3 py-3 px-4 rounded-lg text-base font-semibold text-[#3D2B1F] hover:bg-[#C4522A]/10 hover:text-[#C4522A] transition-all duration-200 text-left"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                <Search size={18} />
                Buscar
              </button>
              <Link
                href="/favoritos"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 py-3 px-4 rounded-lg text-base font-semibold text-[#3D2B1F] hover:bg-[#C4522A]/10 hover:text-[#C4522A] transition-all duration-200"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                <Heart size={18} />
                Favoritos
                {wishlistCount > 0 ? (
                  <span className="ml-auto text-xs font-bold text-[#C4522A]">{wishlistCount}</span>
                ) : null}
              </Link>
            </nav>
            <div className="mt-auto pt-6 border-t border-[#C4522A]/15">
              {!isLoading && (
                <Link
                  href={user ? "/conta" : "/entrar"}
                  onClick={() => setMobileOpen(false)}
                  className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-[#C4522A]/20 bg-white/40 py-3 text-sm font-semibold text-[#3D2B1F] hover:bg-[#C4522A]/10 hover:text-[#C4522A] transition-all duration-200"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  <UserRound size={18} />
                  {user ? "Minha conta" : "Entrar"}
                </Link>
              )}
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
