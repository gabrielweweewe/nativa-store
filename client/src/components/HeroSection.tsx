/**
 * Nativa Store — Hero Section
 * Carrossel de banners full-width com fallback para o banner clássico.
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
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
  "w-full h-[50vh] max-h-[330px] sm:h-[52vh] sm:max-h-[380px] md:h-auto md:max-h-[min(72vh,720px)] object-cover block select-none";

const AUTOPLAY_MS = 5500;

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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    skipSnaps: false,
    duration: 28,
  });

  useEffect(() => {
    let cancelled = false;
    fetchActiveBanners().then((data) => {
      if (!cancelled) setBanners(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!emblaApi || banners.length === 0) return;
    emblaApi.reInit();
  }, [emblaApi, banners]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || banners.length <= 1) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      timer = setInterval(() => {
        emblaApi.scrollNext();
      }, AUTOPLAY_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
    };

    start();
    emblaApi.on("pointerDown", stop);
    emblaApi.on("pointerUp", start);

    return () => {
      stop();
      emblaApi.off("pointerDown", stop);
      emblaApi.off("pointerUp", start);
    };
  }, [emblaApi, banners.length]);

  const showControls = banners.length > 1;

  return (
    <section className="relative w-full overflow-hidden" style={{ background: "#F5F0E8" }}>
      <div className="relative">
        {banners.length === 0 ? (
          <div
            className={`${IMAGE_CLASS} animate-pulse bg-[#E8DFD0]`}
            aria-hidden
          />
        ) : (
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {banners.map((banner) => (
                <div key={banner.id} className="min-w-0 shrink-0 grow-0 basis-full">
                  <BannerSlide banner={banner} />
                </div>
              ))}
            </div>
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
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/85 p-2 text-[#2D2A26] shadow-md backdrop-blur-sm transition hover:bg-white sm:left-3 sm:flex md:left-4"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Próximo banner"
              onClick={() => emblaApi?.scrollNext()}
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
                  onClick={() => emblaApi?.scrollTo(index)}
                  className={`h-2 rounded-full transition-all ${
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
