/**
 * Nativa Store — Hero Section
 * Carrossel de banners com transição em fade (mais elegante que slide).
 */

import {
  FeatherOrange,
  FeatherBlue,
  FeatherGreen,
  FeatherRed,
  WaveDividerDown,
} from "./NativaDecorations";
import { fetchActiveBanners } from "@/lib/banners";
import type { Banner } from "@shared/types/banner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

const IMAGE_CLASS =
  "w-full h-[50vh] max-h-[330px] sm:h-[52vh] sm:max-h-[380px] md:h-auto md:max-h-none object-cover block select-none";

const AUTOPLAY_MS = 6500;
const SWIPE_THRESHOLD_PX = 48;

function BannerSlide({ banner }: { banner: Banner }) {
  const mobileSrc = banner.imageUrlMobile || banner.imageUrl;

  const content = (
    <>
      <img
        src={mobileSrc}
        alt={banner.altText}
        className={`${IMAGE_CLASS} sm:hidden`}
        style={{ objectPosition: banner.objectPositionMobile }}
        draggable={false}
      />
      <img
        src={banner.imageUrl}
        alt={banner.altText}
        className={`${IMAGE_CLASS} hidden sm:block`}
        style={{ objectPosition: banner.objectPosition }}
        draggable={false}
      />
    </>
  );

  if (banner.linkUrl) {
    return (
      <a
        href={banner.linkUrl}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4522A] focus-visible:ring-inset"
        tabIndex={-1}
      >
        {content}
      </a>
    );
  }

  return <div className="block">{content}</div>;
}

export default function HeroSection() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetchActiveBanners().then((data) => {
      if (!cancelled) setBanners(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (banners.length === 0) return;
      const next = ((index % banners.length) + banners.length) % banners.length;
      setSelectedIndex(next);
    },
    [banners.length],
  );

  const goNext = useCallback(() => goTo(selectedIndex + 1), [goTo, selectedIndex]);
  const goPrev = useCallback(() => goTo(selectedIndex - 1), [goTo, selectedIndex]);

  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const timer = setInterval(goNext, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [banners.length, goNext, isPaused]);

  const showControls = banners.length > 1;

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
    setIsPaused(true);
  }

  function handleTouchMove(event: React.TouchEvent) {
    if (touchStartX.current == null) return;
    touchDeltaX.current = (event.touches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
  }

  function handleTouchEnd() {
    if (Math.abs(touchDeltaX.current) >= SWIPE_THRESHOLD_PX) {
      if (touchDeltaX.current < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setIsPaused(false);
  }

  return (
    <section className="relative w-full overflow-hidden" style={{ background: "#F5F0E8" }}>
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {banners.length === 0 ? (
          <div className={`${IMAGE_CLASS} animate-pulse bg-[#E8DFD0]`} aria-hidden />
        ) : (
          <div className="relative" aria-roledescription="carousel" aria-label="Banners da loja">
            {banners.map((banner, index) => {
              const isActive = index === selectedIndex;
              return (
                <div
                  key={banner.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-hidden={!isActive}
                  className={`hero-banner-slide ${
                    isActive
                      ? "relative z-[1] opacity-100"
                      : "pointer-events-none absolute inset-0 z-0 opacity-0"
                  }`}
                >
                  <BannerSlide banner={banner} />
                </div>
              );
            })}
          </div>
        )}

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

        {showControls && (
          <>
            <button
              type="button"
              aria-label="Banner anterior"
              onClick={goPrev}
              className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/85 p-2 text-[#2D2A26] shadow-md backdrop-blur-sm transition hover:bg-white sm:left-3 sm:flex md:left-4"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Próximo banner"
              onClick={goNext}
              className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/85 p-2 text-[#2D2A26] shadow-md backdrop-blur-sm transition hover:bg-white sm:right-3 sm:flex md:right-4"
            >
              <ChevronRight className="size-5" />
            </button>

            <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2 sm:bottom-8">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  aria-label={`Ir para banner ${index + 1}`}
                  aria-current={index === selectedIndex}
                  onClick={() => goTo(index)}
                  className={`h-2 rounded-full transition-all duration-500 ease-out ${
                    index === selectedIndex
                      ? "w-6 bg-[#C4522A]"
                      : "w-2 bg-white/80 hover:bg-white"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10">
          <WaveDividerDown color="#F5F0E8" />
        </div>
      </div>
    </section>
  );
}
