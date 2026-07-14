/**
 * Nativa Store — Categories Section
 * Design: Brasil Vivo — medalhões circulares (sem cards), linha de costura
 */

import type { ReactElement } from "react";
import { FeatherBlue, FeatherGreen, FeatherOrange } from "./NativaDecorations";
import { toast } from "sonner";

function IconBolsas({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path d="M14 20 L10 42 L38 42 L34 20 Z" fill="currentColor" opacity="0.85" />
      <path d="M18 20 C18 14, 30 14, 30 20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M20 28 C22 24, 26 24, 28 28 C26 32, 22 32, 20 28Z" fill="#52A87A" opacity="0.75" />
      <line x1="14" y1="26" x2="34" y2="26" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.45" />
    </svg>
  );
}

function IconNovidades({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path d="M24 8 L26 18 L36 16 L28 22 L32 32 L24 26 L16 32 L20 22 L12 16 L22 18 Z" fill="currentColor" opacity="0.9" />
      <path d="M30 32 C32 28, 34 24, 32 20 C30 16, 28 20, 30 32Z" fill="#E8821A" opacity="0.65" />
    </svg>
  );
}

function IconColecoes({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect x="10" y="14" width="28" height="22" rx="3" fill="currentColor" opacity="0.8" />
      <path d="M16 14 C16 10, 32 10, 32 14" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="24" cy="25" r="4" fill="#E8821A" opacity="0.85" />
    </svg>
  );
}

function IconPresentes({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect x="10" y="22" width="28" height="20" rx="3" fill="currentColor" opacity="0.8" />
      <rect x="8" y="16" width="32" height="8" rx="2" fill="currentColor" opacity="0.95" />
      <line x1="24" y1="16" x2="24" y2="42" stroke="white" strokeWidth="2.5" opacity="0.5" />
      <line x1="8" y1="20" x2="40" y2="20" stroke="white" strokeWidth="2.5" opacity="0.5" />
      <path d="M24 16 C20 12, 14 12, 16 8 C18 4, 24 8, 24 16Z" fill="#E8821A" opacity="0.85" />
      <path d="M24 16 C28 12, 34 12, 32 8 C30 4, 24 8, 24 16Z" fill="#E8821A" opacity="0.85" />
    </svg>
  );
}

type CategoryFilter = "Todos" | "Bolsas" | null;

type CategoryItem = {
  id: string;
  name: string;
  description: string;
  color: string;
  wash: string;
  filter: CategoryFilter;
  Icon: (props: { className?: string }) => ReactElement;
};

const categories: CategoryItem[] = [
  {
    id: "bolsas",
    name: "Bolsas",
    description: "Feitas à mão",
    color: "#2D6A4F",
    wash: "radial-gradient(circle at 35% 30%, #52A87A28, #2D6A4F14 55%, transparent 72%)",
    filter: "Bolsas",
    Icon: IconBolsas,
  },
  {
    id: "novidades",
    name: "Novidades",
    description: "Chegou agora",
    color: "#C4522A",
    wash: "radial-gradient(circle at 35% 30%, #E8821A28, #C4522A14 55%, transparent 72%)",
    filter: "Todos",
    Icon: IconNovidades,
  },
  {
    id: "colecoes",
    name: "Coleções",
    description: "Edições especiais",
    color: "#C9922A",
    wash: "radial-gradient(circle at 35% 30%, #E8B84028, #C9922A14 55%, transparent 72%)",
    filter: "Todos",
    Icon: IconColecoes,
  },
  {
    id: "presentes",
    name: "Presentes",
    description: "Com carinho",
    color: "#1B7A8C",
    wash: "radial-gradient(circle at 35% 30%, #2D9CAE28, #1B7A8C14 55%, transparent 72%)",
    filter: null,
    Icon: IconPresentes,
  },
];

function StitchDot() {
  return (
    <span
      className="hidden md:block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: "#C4522A55" }}
      aria-hidden
    />
  );
}

function openCategory(cat: CategoryItem) {
  if (cat.filter == null) {
    toast("Presentes em breve", {
      description: "Estamos preparando kits especiais com bolsas artesanais.",
    });
    return;
  }

  window.dispatchEvent(
    new CustomEvent("nativa:set-category", { detail: cat.filter }),
  );
  document.getElementById("colecoes")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function CategoriesSection() {
  return (
    <section className="relative overflow-hidden py-12 md:py-20" style={{ background: "#F5F0E8" }}>
      <div className="pointer-events-none absolute left-[6%] top-10 opacity-30 feather-float hidden sm:block">
        <FeatherOrange className="h-12 w-5 rotate-[-18deg]" />
      </div>
      <div className="pointer-events-none absolute right-[8%] top-24 opacity-25 feather-float-delay hidden sm:block">
        <FeatherGreen className="h-11 w-5 rotate-[14deg]" />
      </div>
      <div className="pointer-events-none absolute bottom-16 left-[18%] opacity-20 feather-float-delay2 hidden md:block">
        <FeatherBlue className="h-10 w-4 rotate-[-8deg]" />
      </div>

      <div className="container relative">
        <div className="mx-auto mb-12 max-w-xl text-center md:mb-16">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-[#C4522A]/35 sm:w-14" />
            <span
              className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2D6A4F]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Caminhos da loja
            </span>
            <span className="h-px w-10 bg-[#C4522A]/35 sm:w-14" />
          </div>
          <h2
            className="mb-3 text-3xl font-bold md:text-5xl"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              background: "linear-gradient(135deg, #C4522A, #E8821A, #C9922A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Explore nossa loja
          </h2>
          <p
            className="text-base text-[#8B6F5E] md:text-lg"
            style={{ fontFamily: "'Lora', serif", fontStyle: "italic" }}
          >
            Cada bolsa, uma história costurada com amor
          </p>
        </div>

        <nav aria-label="Categorias da loja">
          <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:items-start md:justify-center md:gap-0 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
            {categories.map((cat, index) => {
              const { Icon } = cat;
              return (
                <li
                  key={cat.id}
                  className="flex shrink-0 snap-center items-center md:shrink"
                >
                  {index > 0 && (
                    <div className="mx-1 hidden items-center gap-1.5 md:flex lg:mx-2" aria-hidden>
                      <StitchDot />
                      <StitchDot />
                      <StitchDot />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openCategory(cat)}
                    className="group flex w-[7.5rem] flex-col items-center gap-3 px-1 py-2 text-center transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4522A]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E8] sm:w-[8.5rem] md:w-[9rem]"
                  >
                    <span
                      className="relative flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full transition-transform duration-500 ease-out group-hover:scale-105 sm:h-[5.25rem] sm:w-[5.25rem] md:h-[5.75rem] md:w-[5.75rem]"
                      style={{
                        background: cat.wash,
                        color: cat.color,
                        boxShadow: `inset 0 0 0 1.5px ${cat.color}22`,
                      }}
                    >
                      <span
                        className="absolute inset-[7px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{
                          boxShadow: `0 10px 28px ${cat.color}28`,
                        }}
                        aria-hidden
                      />
                      <Icon className="relative z-[1] h-8 w-8 transition-transform duration-500 ease-out group-hover:rotate-[-6deg] sm:h-9 sm:w-9" />
                    </span>

                    <span className="space-y-0.5">
                      <span
                        className="block text-[15px] font-bold leading-tight transition-colors duration-300 md:text-base"
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                          color: cat.color,
                        }}
                      >
                        {cat.name}
                      </span>
                      <span
                        className="block text-[11px] leading-snug text-[#8B6F5E] sm:text-xs"
                        style={{ fontFamily: "'Lora', serif", fontStyle: "italic" }}
                      >
                        {cat.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </section>
  );
}
