/**
 * Nativa Store — About Section
 * Design: Brasil Vivo — Artesanato com Alma
 * Two-column layout: portrait artisan photo left, story text right
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowNativa, FeatherGreen, FeatherRed, WaveDividerDown, WaveDividerUp } from "./NativaDecorations";

const ABOUT_IMAGE = "/images/1cad9ce5-deab-4955-8b80-f93e26115088.jpg";
const MAX_TILT = 10;

type TiltState = {
  rotateX: number;
  rotateY: number;
  glareX: number;
  glareY: number;
  isHovering: boolean;
};

const TILT_RESET: TiltState = {
  rotateX: 0,
  rotateY: 0,
  glareX: 50,
  glareY: 50,
  isHovering: false,
};

function AboutPhotoCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<TiltState>(TILT_RESET);
  const [motionReduced, setMotionReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (motionReduced) return;

      const element = cardRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      setTilt({
        rotateX: ((centerY - y) / centerY) * MAX_TILT,
        rotateY: ((x - centerX) / centerX) * MAX_TILT,
        glareX: (x / rect.width) * 100,
        glareY: (y / rect.height) * 100,
        isHovering: true,
      });
    },
    [motionReduced],
  );

  const handleMouseLeave = useCallback(() => {
    setTilt(TILT_RESET);
  }, []);

  const cardTransform = tilt.isHovering
    ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(1.03, 1.03, 1.03)`
    : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";

  const backdropTransform = tilt.isHovering
    ? `translate3d(${12 + tilt.rotateY * 0.6}px, ${12 - tilt.rotateX * 0.6}px, -40px) rotateY(${-tilt.rotateY * 0.35}deg)`
    : "translate3d(12px, 12px, -40px)";

  return (
    <div
      ref={cardRef}
      className="relative w-full max-w-[280px] sm:max-w-[300px] lg:max-w-[340px]"
      style={{ perspective: "1200px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="absolute top-5 left-5 right-0 bottom-0 rounded-3xl hidden sm:block"
        style={{
          background: "linear-gradient(145deg, #C4522A22, #2D6A4F18)",
          transform: backdropTransform,
          transformStyle: "preserve-3d",
          transition: tilt.isHovering ? "none" : "transform 0.55s ease-out",
        }}
        aria-hidden
      />

      <div
        className="relative will-change-transform"
        style={{
          transform: cardTransform,
          transformStyle: "preserve-3d",
          transition: tilt.isHovering
            ? "box-shadow 0.15s ease"
            : "transform 0.55s ease-out, box-shadow 0.55s ease-out",
          boxShadow: tilt.isHovering
            ? `${tilt.rotateY * -1.2}px ${24 + tilt.rotateX * -0.8}px 56px oklch(0.52 0.14 38 / 0.28)`
            : "0 24px 64px oklch(0.52 0.14 38 / 0.18)",
        }}
      >
        <div className="relative rounded-3xl overflow-hidden ring-[3px] ring-white/90">
          <img
            src={ABOUT_IMAGE}
            alt="Artesã Nativa no ateliê, com bolsa artesanal e máquina de costura"
            className="w-full h-auto block"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          {tilt.isHovering && !motionReduced && (
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.28) 0%, transparent 55%)`,
                mixBlendMode: "soft-light",
              }}
              aria-hidden
            />
          )}
        </div>

        <div
          className="absolute -bottom-5 -right-3 sm:-right-6 bg-white rounded-2xl p-4 shadow-xl border border-[#E8D5C4] z-10"
          style={{
            maxWidth: "168px",
            transform: tilt.isHovering
              ? "translateZ(36px) rotateX(-2deg)"
              : "translateZ(0)",
            transition: tilt.isHovering ? "none" : "transform 0.55s ease-out",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🪡</span>
            <span
              className="text-xs font-bold text-[#C4522A] uppercase tracking-wide"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Feito à mão
            </span>
          </div>
          <p
            className="text-xs text-[#8B6F5E] leading-snug"
            style={{ fontFamily: "'Lora', serif" }}
          >
            Cada peça costurada com carinho no nosso ateliê
          </p>
        </div>
      </div>
    </div>
  );
}

const values = [
  {
    icon: "🪡",
    title: "100% Artesanal",
    desc: "Cada peça é bordada e costurada à mão por artesãs brasileiras.",
  },
  {
    icon: "🌿",
    title: "Sustentável",
    desc: "Usamos tecidos naturais e tingimentos com plantas nativas.",
  },
  {
    icon: "🦜",
    title: "Identidade",
    desc: "Inspiradas na riqueza cultural e natural do Brasil.",
  },
];

export default function AboutSection() {
  return (
    <>
      <WaveDividerUp color="#FAF7F2" />
      <section
        id="sobre"
        className="py-20 relative overflow-hidden"
        style={{ background: "#F5F0E8" }}
      >
        {/* Floating feathers */}
        <div className="absolute top-16 left-4 feather-float-delay opacity-30">
          <FeatherGreen className="w-7 h-16 rotate-[-25deg]" />
        </div>
        <div className="absolute bottom-20 right-6 feather-float opacity-35">
          <FeatherRed className="w-6 h-14 rotate-[20deg]" />
        </div>

        <div className="container">
          <div className="grid md:grid-cols-[minmax(0,340px)_1fr] lg:grid-cols-[minmax(0,380px)_1fr] gap-12 lg:gap-16 xl:gap-20 items-center">
            {/* Portrait photo — 3D tilt on hover */}
            <div className="relative order-2 md:order-1 flex justify-center md:justify-start py-2">
              <AboutPhotoCard />
            </div>

            {/* Text side */}
            <div className="order-1 md:order-2">
              <div className="flex items-center gap-3 mb-4">
                <ArrowNativa className="w-20 h-4" />
                <span
                  className="text-xs font-semibold text-[#1B7A8C] uppercase tracking-widest"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Nossa História
                </span>
              </div>

              <h2
                className="text-4xl md:text-5xl font-bold leading-tight mb-6"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  background: "linear-gradient(135deg, #C4522A, #E8821A, #2D6A4F)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Vestir identidade<br />
                <span style={{ WebkitTextFillColor: "#3D2B1F", backgroundClip: "unset" }}>
                  é nossa missão
                </span>
              </h2>

              <p
                className="text-[#5C4033] text-base leading-relaxed mb-4"
                style={{ fontFamily: "'Lora', serif" }}
              >
                A Nativa nasceu do amor pela cultura brasileira e pelo artesanato. Cada peça que criamos carrega a essência da nossa terra — as cores vibrantes da Amazônia, os padrões dos povos originários e a riqueza da fauna e flora nativa.
              </p>
              <p
                className="text-[#8B6F5E] text-base leading-relaxed mb-8"
                style={{ fontFamily: "'Lora', serif", fontStyle: "italic" }}
              >
                "Não fazemos moda. Fazemos memória vestível."
              </p>

              {/* Values */}
              <div className="grid grid-cols-1 gap-4">
                {values.map((val) => (
                  <div key={val.title} className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: "linear-gradient(135deg, #C4522A15, #E8821A20)" }}
                    >
                      {val.icon}
                    </div>
                    <div>
                      <h4
                        className="text-sm font-bold text-[#3D2B1F] mb-0.5"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                      >
                        {val.title}
                      </h4>
                      <p
                        className="text-xs text-[#8B6F5E] leading-relaxed"
                        style={{ fontFamily: "'Lora', serif" }}
                      >
                        {val.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <WaveDividerDown color="#FAF7F2" />
    </>
  );
}
