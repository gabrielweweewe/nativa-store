import { useFancyboxBind } from "@/hooks/useFancybox";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

const imageLabels = ["Visão geral", "Detalhe", "Acabamento", "Galeria"];
const SWIPE_THRESHOLD_PX = 48;

interface ProductGalleryProps {
  images: string[];
  productName: string;
  badge: string;
  badgeColor: string;
  discount?: number | null;
}

export default function ProductGallery({
  images,
  productName,
  badge,
  badgeColor,
  discount,
}: ProductGalleryProps) {
  const galleryId = useId().replace(/:/g, "");
  const fancyboxGroup = `product-${galleryId}`;
  const galleryRef = useFancyboxBind();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const total = images.length;
  const hasMultiple = total > 1;

  const goTo = useCallback(
    (index: number) => {
      if (total === 0) return;
      setSelectedIndex(((index % total) + total) % total);
    },
    [total],
  );

  const goPrev = useCallback(() => goTo(selectedIndex - 1), [goTo, selectedIndex]);
  const goNext = useCallback(() => goTo(selectedIndex + 1), [goTo, selectedIndex]);

  function handleTouchStart(event: React.TouchEvent) {
    if (!hasMultiple) return;
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
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
  }

  if (total === 0) return null;

  return (
    <div ref={galleryRef} className="w-full">
      <div className="flex w-full flex-col gap-3 md:flex-row md:gap-4">
        {hasMultiple && (
          <div className="order-2 hidden shrink-0 flex-col gap-2.5 md:order-1 md:flex">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-all duration-200 lg:h-[4.5rem] lg:w-[4.5rem] ${
                  selectedIndex === i
                    ? "border-[#C4522A] shadow-md ring-2 ring-[#C4522A]/20"
                    : "border-[#E8D5C4] opacity-75 hover:border-[#C4522A]/40 hover:opacity-100"
                }`}
                aria-label={imageLabels[i] ?? `Imagem ${i + 1}`}
                aria-current={selectedIndex === i}
              >
                <img src={img} alt="" className="absolute inset-0 size-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="order-1 min-w-0 flex-1 md:order-2">
          <div
            className="group relative aspect-[4/5] overflow-hidden rounded-[1.35rem] border border-[#E8D5C4]/80 bg-[#EDE6DA] shadow-sm sm:rounded-2xl"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {images.map((img, i) => (
              <a
                key={img + i}
                data-fancybox={fancyboxGroup}
                href={img}
                data-caption={`${productName} — ${imageLabels[i] ?? `Imagem ${i + 1}`}`}
                className={`absolute inset-0 block transition-opacity duration-500 ease-out ${
                  i === selectedIndex
                    ? "z-10 cursor-zoom-in opacity-100"
                    : "pointer-events-none z-0 opacity-0"
                }`}
                aria-hidden={i !== selectedIndex}
                tabIndex={i === selectedIndex ? 0 : -1}
                aria-label="Ampliar imagem do produto"
              >
                <img
                  src={img}
                  alt={`${productName} — ${imageLabels[i] ?? `Imagem ${i + 1}`}`}
                  className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  draggable={false}
                />
              </a>
            ))}

            <div
              className="pointer-events-none absolute left-3 top-3 z-20 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm sm:left-4 sm:top-4"
              style={{ background: badgeColor, fontFamily: "'Nunito', sans-serif" }}
            >
              {badge}
            </div>

            {discount != null && discount > 0 && (
              <div
                className="pointer-events-none absolute right-3 top-3 z-20 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm sm:right-4 sm:top-4"
                style={{ background: "#E8821A", fontFamily: "'Nunito', sans-serif" }}
              >
                -{discount}%
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 z-20 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />

            <div
              className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#3D2B1F] shadow-sm backdrop-blur-sm opacity-100 md:bottom-4 md:right-4 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              <ZoomIn size={14} className="text-[#C4522A]" />
              Ampliar
            </div>

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#E8D5C4] bg-white/90 text-[#3D2B1F] shadow-md backdrop-blur-sm transition-all hover:bg-white hover:text-[#C4522A] md:left-3 md:flex md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#E8D5C4] bg-white/90 text-[#3D2B1F] shadow-md backdrop-blur-sm transition-all hover:bg-white hover:text-[#C4522A] md:right-3 md:flex md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight size={20} />
                </button>

                <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5 md:hidden">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Ir para imagem ${i + 1}`}
                      aria-current={i === selectedIndex}
                      onClick={() => goTo(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === selectedIndex ? "w-5 bg-[#C4522A]" : "w-1.5 bg-white/85"
                      }`}
                    />
                  ))}
                </div>

                <div
                  className="pointer-events-none absolute bottom-4 left-4 z-20 hidden rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm md:block"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  {selectedIndex + 1} / {total}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {hasMultiple && (
        <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                selectedIndex === i ? "border-[#C4522A]" : "border-[#E8D5C4] opacity-70"
              }`}
              aria-label={imageLabels[i] ?? `Imagem ${i + 1}`}
            >
              <img src={img} alt="" className="absolute inset-0 size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
