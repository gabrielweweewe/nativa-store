/**
 * Nativa Store — Features / USP Section (Illustrated Icons)
 * Design: Brasil Vivo — Artesanato com Alma
 * Custom illustrated SVG icons inspired by Brazilian craft/fauna
 * Amendment: "All UI icons must be custom-feeling illustrated motifs"
 */

// Custom illustrated SVG icons — Brazilian craft universe
function IconNeedle() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      <ellipse cx="20" cy="8" rx="4" ry="6" fill="#C4522A" opacity="0.85"/>
      <ellipse cx="20" cy="8" rx="2" ry="2.5" fill="white" opacity="0.6"/>
      <line x1="20" y1="14" x2="20" y2="36" stroke="#C4522A" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18 34 L20 38 L22 34" fill="#C4522A"/>
      <path d="M14 20 Q20 18 26 22" stroke="#E8821A" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
}

function IconLeaf() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      <path d="M20 4 C30 8, 38 18, 34 28 C30 36, 20 38, 20 38 C20 38, 10 36, 6 28 C2 18, 10 8, 20 4Z" fill="#2D6A4F" opacity="0.8"/>
      <path d="M20 4 L20 38" stroke="#1A4A35" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M20 12 C26 16, 30 22, 28 28" stroke="#52A87A" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7"/>
      <path d="M20 18 C14 22, 10 26, 12 30" stroke="#52A87A" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

function IconTruck() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      {/* Truck body with leaf motif */}
      <rect x="4" y="14" width="22" height="14" rx="3" fill="#1B7A8C" opacity="0.85"/>
      <path d="M26 18 L36 18 L36 28 L26 28 Z" fill="#1B7A8C" opacity="0.7"/>
      <path d="M26 18 L32 14 L36 18" fill="#1B7A8C" opacity="0.9"/>
      <circle cx="10" cy="30" r="3" fill="#0D5C6B"/>
      <circle cx="10" cy="30" r="1.5" fill="white" opacity="0.5"/>
      <circle cx="30" cy="30" r="3" fill="#0D5C6B"/>
      <circle cx="30" cy="30" r="1.5" fill="white" opacity="0.5"/>
      {/* Speed lines */}
      <line x1="2" y1="18" x2="8" y2="18" stroke="#4AABB8" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="2" y1="22" x2="6" y2="22" stroke="#4AABB8" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      {/* Indigenous-style arrow */}
      <line x1="6" y1="20" x2="30" y2="20" stroke="#C9922A" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M28 14 L36 20 L28 26" fill="#C9922A"/>
      {/* Decorative beads */}
      <circle cx="12" cy="20" r="2" fill="#E8821A"/>
      <circle cx="18" cy="20" r="1.5" fill="#C4522A"/>
      <circle cx="24" cy="20" r="2" fill="#E8821A"/>
      {/* Feather */}
      <path d="M8 20 C6 16, 4 14, 6 12 C8 10, 10 14, 8 20Z" fill="#2D6A4F" opacity="0.7"/>
      <line x1="8" y1="20" x2="6" y2="12" stroke="#1A4A35" strokeWidth="0.8" opacity="0.6"/>
    </svg>
  );
}

const features = [
  {
    icon: <IconNeedle />,
    title: "Bordado à Mão",
    desc: "Cada ponto é feito com dedicação por artesãs brasileiras experientes.",
    color: "#C4522A",
    bg: "linear-gradient(135deg, #C4522A12, #E8821A18)",
    border: "#C4522A25",
  },
  {
    icon: <IconTruck />,
    title: "Frete Grátis",
    desc: "Em compras acima de R$ 299 para todo o Brasil.",
    color: "#1B7A8C",
    bg: "linear-gradient(135deg, #1B7A8C12, #2D9CAE18)",
    border: "#1B7A8C25",
  },
  {
    icon: <IconArrow />,
    title: "Troca Fácil",
    desc: "30 dias para troca ou devolução sem complicações.",
    color: "#C9922A",
    bg: "linear-gradient(135deg, #C9922A12, #E8B84018)",
    border: "#C9922A25",
  },
  {
    icon: <IconLeaf />,
    title: "Eco-Consciente",
    desc: "Embalagens biodegradáveis e processos sustentáveis.",
    color: "#2D6A4F",
    bg: "linear-gradient(135deg, #2D6A4F12, #52A87A18)",
    border: "#2D6A4F25",
  },
];

export default function FeaturesSection() {
  return (
    <section
      className="py-8 md:py-12 border-y"
      style={{
        background: "linear-gradient(135deg, #F5F0E8 0%, #FAF7F2 100%)",
        borderColor: "#E8D5C4",
      }}
    >
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {features.map((feat, i) => (
            <div
              key={feat.title}
              className="flex flex-row sm:flex-col items-center sm:text-center gap-3 group p-3 sm:p-4 rounded-xl md:rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              style={{
                background: feat.bg,
                border: `1px solid ${feat.border}`,
                animationDelay: `${i * 80}ms`,
              }}
            >
              <div
                className="w-11 h-11 sm:w-14 sm:h-14 shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                style={{ background: "white", boxShadow: `0 4px 12px ${feat.color}20` }}
              >
                {feat.icon}
              </div>
              <div className="min-w-0 text-left sm:text-center">
                <h4
                  className="text-xs sm:text-sm font-bold mb-0.5 sm:mb-1"
                  style={{ fontFamily: "'Nunito', sans-serif", color: feat.color }}
                >
                  {feat.title}
                </h4>
                <p
                  className="text-[11px] sm:text-xs text-[#8B6F5E] leading-snug sm:leading-relaxed"
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
