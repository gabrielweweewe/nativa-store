/**
 * Nativa Store — Categories Section (Illustrated Motifs)
 * Design: Brasil Vivo — Artesanato com Alma
 * Custom illustrated SVG icons — Brazilian fauna/craft universe
 * Amendment: "All UI icons must be custom-feeling illustrated motifs"
 */

import { toast } from "sonner";

// Custom illustrated SVG icons
function IconRoupas() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
      {/* Blouse silhouette with embroidery */}
      <path d="M16 8 L8 16 L12 18 L12 40 L36 40 L36 18 L40 16 L32 8 C30 12 26 14 24 14 C22 14 18 12 16 8Z" fill="#C4522A" opacity="0.75"/>
      {/* Embroidery dots */}
      <circle cx="20" cy="24" r="1.5" fill="#E8821A"/>
      <circle cx="24" cy="22" r="1.5" fill="#2D6A4F"/>
      <circle cx="28" cy="24" r="1.5" fill="#1B7A8C"/>
      <circle cx="24" cy="28" r="1.5" fill="#C9922A"/>
      {/* Collar */}
      <path d="M20 8 C22 12 26 12 28 8" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6"/>
    </svg>
  );
}

function IconAcessorios() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
      {/* Necklace with feather */}
      <path d="M12 16 Q24 8 36 16 Q40 24 36 32 Q24 40 12 32 Q8 24 12 16Z" stroke="#1B7A8C" strokeWidth="2" fill="none" opacity="0.7"/>
      <circle cx="24" cy="36" r="4" fill="#1B7A8C" opacity="0.8"/>
      {/* Beads */}
      <circle cx="14" cy="20" r="2" fill="#C4522A"/>
      <circle cx="20" cy="12" r="2" fill="#E8821A"/>
      <circle cx="28" cy="12" r="2" fill="#2D6A4F"/>
      <circle cx="34" cy="20" r="2" fill="#C9922A"/>
      {/* Feather pendant */}
      <path d="M22 36 C20 32, 18 28, 20 24 C22 20, 26 20, 26 24 C26 28, 24 32, 22 36Z" fill="#E8821A" opacity="0.7"/>
      <line x1="22" y1="36" x2="22" y2="24" stroke="#C4522A" strokeWidth="0.8" opacity="0.6"/>
    </svg>
  );
}

function IconBolsas() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
      {/* Tote bag */}
      <path d="M14 20 L10 42 L38 42 L34 20 Z" fill="#2D6A4F" opacity="0.75"/>
      <path d="M18 20 C18 14, 30 14, 30 20" stroke="#2D6A4F" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Leaf motif on bag */}
      <path d="M20 28 C22 24, 26 24, 28 28 C26 32, 22 32, 20 28Z" fill="#52A87A" opacity="0.7"/>
      <line x1="24" y1="24" x2="24" y2="32" stroke="#1A4A35" strokeWidth="1" opacity="0.5"/>
      {/* Stitching detail */}
      <line x1="14" y1="26" x2="34" y2="26" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.4"/>
    </svg>
  );
}

function IconColecoes() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
      {/* Star/sparkle with feather */}
      <path d="M24 8 L26 18 L36 16 L28 22 L32 32 L24 26 L16 32 L20 22 L12 16 L22 18 Z" fill="#C9922A" opacity="0.8"/>
      {/* Feather accent */}
      <path d="M30 32 C32 28, 34 24, 32 20 C30 16, 28 20, 30 32Z" fill="#E8821A" opacity="0.6"/>
      <line x1="30" y1="32" x2="32" y2="20" stroke="#C4522A" strokeWidth="0.8" opacity="0.5"/>
    </svg>
  );
}

function IconPresentes() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
      {/* Gift box */}
      <rect x="10" y="22" width="28" height="20" rx="3" fill="#C4522A" opacity="0.75"/>
      <rect x="8" y="16" width="32" height="8" rx="2" fill="#C4522A" opacity="0.9"/>
      {/* Ribbon */}
      <line x1="24" y1="16" x2="24" y2="42" stroke="white" strokeWidth="2.5" opacity="0.5"/>
      <line x1="8" y1="20" x2="40" y2="20" stroke="white" strokeWidth="2.5" opacity="0.5"/>
      {/* Bow */}
      <path d="M24 16 C20 12, 14 12, 16 8 C18 4, 24 8, 24 16Z" fill="#E8821A" opacity="0.8"/>
      <path d="M24 16 C28 12, 34 12, 32 8 C30 4, 24 8, 24 16Z" fill="#E8821A" opacity="0.8"/>
    </svg>
  );
}

const categories = [
  { id: "roupas", name: "Roupas", description: "Peças bordadas à mão", icon: <IconRoupas />, color: "#C4522A", bg: "linear-gradient(135deg, #C4522A12, #E8821A18)", border: "#C4522A30" },
  { id: "acessorios", name: "Acessórios", description: "Joias e bijuterias nativas", icon: <IconAcessorios />, color: "#1B7A8C", bg: "linear-gradient(135deg, #1B7A8C12, #2D9CAE18)", border: "#1B7A8C30" },
  { id: "bolsas", name: "Bolsas", description: "Telas e couro artesanal", icon: <IconBolsas />, color: "#2D6A4F", bg: "linear-gradient(135deg, #2D6A4F12, #52A87A18)", border: "#2D6A4F30" },
  { id: "colecoes", name: "Coleções", description: "Edições limitadas", icon: <IconColecoes />, color: "#C9922A", bg: "linear-gradient(135deg, #C9922A12, #E8B84018)", border: "#C9922A30" },
  { id: "presentes", name: "Presentes", description: "Kits especiais", icon: <IconPresentes />, color: "#C4522A", bg: "linear-gradient(135deg, #C4522A10, #E8821A15)", border: "#C4522A25" },
];

export default function CategoriesSection() {
  return (
    <section className="py-10 md:py-16" style={{ background: "#F5F0E8" }}>
      <div className="container">
        {/* Section header — left-aligned for asymmetry */}
        <div className="mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-bold uppercase tracking-widest"
            style={{
              background: "linear-gradient(135deg, #2D6A4F15, #52A87A20)",
              border: "1px solid #2D6A4F30",
              color: "#2D6A4F",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            ✦ Explore
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold mb-2"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              background: "linear-gradient(135deg, #C4522A, #E8821A, #C9922A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Categorias
          </h2>
          <p
            className="text-[#8B6F5E] text-base"
            style={{ fontFamily: "'Lora', serif", fontStyle: "italic" }}
          >
            Cada peça, uma história bordada com amor
          </p>
        </div>

        {/* Category cards — horizontal scroll on mobile, wrap on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toast(`Categoria ${cat.name}`, { description: "Em breve disponível!" })}
              className="flex-shrink-0 snap-start group md:flex-shrink"
              style={{ minWidth: "140px" }}
            >
              <div
                className="rounded-2xl p-5 flex flex-col items-center gap-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-1.5 border h-full"
                style={{ background: cat.bg, borderColor: cat.border }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: "white", boxShadow: `0 4px 12px ${cat.color}20` }}
                >
                  {cat.icon}
                </div>
                <div>
                  <div
                    className="text-sm font-bold text-center"
                    style={{ fontFamily: "'Playfair Display', serif", color: cat.color }}
                  >
                    {cat.name}
                  </div>
                  <div
                    className="text-xs text-center text-[#8B6F5E] mt-0.5"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    {cat.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
