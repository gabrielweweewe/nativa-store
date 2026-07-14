/**
 * Nativa Store — Testimonials Section
 * Design: Brasil Vivo — Artesanato com Alma
 * Handcrafted card aesthetic with staggered layout
 */

import { Star } from "lucide-react";
import { FeatherOrange, FeatherGreen } from "./NativaDecorations";

const testimonials = [
  {
    id: 1,
    name: "Mariana Costa",
    location: "São Paulo, SP",
    rating: 5,
    text: "A bolsa que comprei é simplesmente única. Cada detalhe costurado conta uma história. Recebi inúmeros elogios e levo comigo todo dia.",
    product: "Bolsa Tucano",
    initial: "M",
    color: "#C4522A",
  },
  {
    id: 2,
    name: "Fernanda Alves",
    location: "Rio de Janeiro, RJ",
    rating: 5,
    text: "Nunca vi uma marca que captura tão bem a alma brasileira. A bolsa chegou embalada com tanto carinho, parecia um presente. Qualidade impecável.",
    product: "Bolsa Mandala",
    initial: "F",
    color: "#2D6A4F",
  },
  {
    id: 3,
    name: "Juliana Mendes",
    location: "Belo Horizonte, MG",
    rating: 5,
    text: "Minha bolsa Nativa é uma obra de arte. Artesanato brasileiro no seu melhor — original, vibrante e cheia de significado. Já indiquei para todas as amigas!",
    product: "Bolsa Arara",
    initial: "J",
    color: "#1B7A8C",
  },
];

export default function TestimonialsSection() {
  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{ background: "#F5F0E8" }}
    >
      {/* Floating feathers */}
      <div className="absolute top-10 right-[5%] feather-float opacity-30">
        <FeatherOrange className="w-6 h-14 rotate-[15deg]" />
      </div>
      <div className="absolute bottom-12 left-[3%] feather-float-delay opacity-25">
        <FeatherGreen className="w-5 h-12 rotate-[-20deg]" />
      </div>

      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-bold uppercase tracking-widest"
            style={{
              background: "linear-gradient(135deg, #C4522A15, #E8821A15)",
              border: "1px solid #C4522A30",
              color: "#C4522A",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            ✦ Quem Usa, Ama
          </div>
          <h2
            className="text-4xl font-bold"
            style={{
              fontFamily: "'Playfair Display', serif",
              background: "linear-gradient(135deg, #C4522A, #E8821A, #C9922A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Histórias que nos inspiram
          </h2>
        </div>

        {/* Staggered testimonial cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.id}
              className={`bg-white rounded-3xl p-6 border border-[#E8D5C4] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 ${
                i === 1 ? "md:mt-8" : ""
              }`}
            >
              {/* Quote mark */}
              <div
                className="text-5xl font-bold leading-none mb-3 opacity-20"
                style={{ fontFamily: "'Playfair Display', serif", color: t.color }}
              >
                "
              </div>

              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={13} className="fill-[#C9922A] text-[#C9922A]" />
                ))}
              </div>

              {/* Text */}
              <p
                className="text-sm text-[#5C4033] leading-relaxed mb-4"
                style={{ fontFamily: "'Lora', serif", fontStyle: "italic" }}
              >
                "{t.text}"
              </p>

              {/* Product tag */}
              <div
                className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-4"
                style={{
                  background: `${t.color}15`,
                  color: t.color,
                  fontFamily: "'Nunito', sans-serif",
                  border: `1px solid ${t.color}25`,
                }}
              >
                {t.product}
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-3 border-t border-[#F0E8DF]">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}BB)` }}
                >
                  {t.initial}
                </div>
                <div>
                  <div
                    className="text-sm font-bold text-[#3D2B1F]"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    {t.name}
                  </div>
                  <div
                    className="text-xs text-[#8B6F5E]"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {t.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
