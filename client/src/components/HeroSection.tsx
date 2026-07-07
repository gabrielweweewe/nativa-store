/**
 * Nativa Store — Hero Section
 * Design: Brasil Vivo — Artesanato com Alma
 * Full-width hero banner image with floating feather decorations
 */

import {
  FeatherOrange,
  FeatherBlue,
  FeatherGreen,
  FeatherRed,
  WaveDividerDown,
} from "./NativaDecorations";

const feathers = [
  { Feather: FeatherOrange, top: "8%", left: "5%", size: "w-6 h-14", rotate: "rotate-[-20deg]", anim: "feather-float", opacity: 70 },
  { Feather: FeatherBlue, top: "18%", left: "12%", size: "w-5 h-12", rotate: "rotate-[15deg]", anim: "feather-float-delay", opacity: 65 },
  { Feather: FeatherGreen, top: "12%", left: "22%", size: "w-4 h-10", rotate: "rotate-[-10deg]", anim: "feather-float-delay2", opacity: 60 },
  { Feather: FeatherRed, top: "6%", left: "35%", size: "w-5 h-12", rotate: "rotate-[25deg]", anim: "feather-float-delay", opacity: 55 },
  { Feather: FeatherOrange, top: "22%", left: "45%", size: "w-4 h-10", rotate: "rotate-[-15deg]", anim: "feather-float-delay2", opacity: 50 },
  { Feather: FeatherBlue, top: "10%", right: "28%", size: "w-6 h-14", rotate: "rotate-[10deg]", anim: "feather-float", opacity: 65 },
  { Feather: FeatherGreen, top: "20%", right: "18%", size: "w-5 h-12", rotate: "rotate-[-25deg]", anim: "feather-float-delay", opacity: 60 },
  { Feather: FeatherRed, top: "8%", right: "8%", size: "w-7 h-16", rotate: "rotate-[20deg]", anim: "feather-float-delay2", opacity: 70 },
  { Feather: FeatherOrange, top: "45%", left: "3%", size: "w-5 h-12", rotate: "rotate-[30deg]", anim: "feather-float-delay2", opacity: 55 },
  { Feather: FeatherBlue, top: "55%", left: "10%", size: "w-4 h-10", rotate: "rotate-[-20deg]", anim: "feather-float", opacity: 50 },
  { Feather: FeatherGreen, top: "50%", right: "5%", size: "w-6 h-14", rotate: "rotate-[15deg]", anim: "feather-float-delay", opacity: 60 },
  { Feather: FeatherRed, top: "62%", right: "12%", size: "w-5 h-12", rotate: "rotate-[-30deg]", anim: "feather-float-delay2", opacity: 55 },
  { Feather: FeatherOrange, top: "70%", left: "18%", size: "w-4 h-10", rotate: "rotate-[-10deg]", anim: "feather-float", opacity: 45 },
  { Feather: FeatherBlue, top: "75%", right: "25%", size: "w-5 h-12", rotate: "rotate-[20deg]", anim: "feather-float-delay", opacity: 50 },
  { Feather: FeatherGreen, top: "38%", right: "40%", size: "w-4 h-10", rotate: "rotate-[-15deg]", anim: "feather-float-delay2", opacity: 40 },
];

export default function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden" style={{ background: "#F5F0E8" }}>
      <img
        src="/images/bannerNativa.jpg"
        alt="Nativa — Fauna e flora brasileira"
        className="w-full h-[38vh] max-h-[260px] sm:h-[48vh] sm:max-h-[340px] md:h-auto md:max-h-none object-cover object-[center_20%] md:object-center block"
      />

      <div className="absolute inset-0 pointer-events-none z-10 hidden sm:block">
        {feathers.map(({ Feather, top, left, right, size, rotate, anim, opacity }, i) => (
          <div
            key={i}
            className={`absolute ${anim}`}
            style={{ top, left, right, opacity: opacity / 100 }}
          >
            <Feather className={`${size} ${rotate}`} />
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <WaveDividerDown color="#F5F0E8" />
      </div>
    </section>
  );
}
