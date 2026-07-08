import { useFancyboxBind } from "@/hooks/useFancybox";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useCallback, useId, useState } from "react";

const imageLabels = ["Visão geral", "Detalhe", "Acabamento", "Galeria"];

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

  if (total === 0) return null;

  return (
    <div ref={galleryRef}>
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full">
        {/* Thumbnails — vertical no desktop */}
        {hasMultiple && (
          <div className="hidden md:flex flex-col gap-2.5 order-2 md:order-1 shrink-0">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={`relative w-16 h-16 lg:w-[4.5rem] lg:h-[4.5rem] rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                  selectedIndex === i
                    ? "border-[#C4522A] shadow-md ring-2 ring-[#C4522A]/20"
                    : "border-[#E8D5C4] opacity-75 hover:opacity-100 hover:border-[#C4522A]/40"
                }`}
                aria-label={imageLabels[i] ?? `Imagem ${i + 1}`}
                aria-current={selectedIndex === i}
              >
                <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Imagem principal — links Fancybox empilhados; só o ativo recebe clique */}
        <div className="flex-1 min-w-0 order-1 md:order-2">
          <div className="group relative rounded-2xl overflow-hidden bg-white border border-[#E8D5C4] aspect-[4/5] shadow-sm">
            {images.map((img, i) => (
              <a
                key={img + i}
                data-fancybox={fancyboxGroup}
                href={img}
                data-caption={`${productName} — ${imageLabels[i] ?? `Imagem ${i + 1}`}`}
                className={`absolute inset-0 block transition-opacity duration-300 ${
                  i === selectedIndex
                    ? "z-10 opacity-100 cursor-zoom-in"
                    : "z-0 opacity-0 pointer-events-none"
                }`}
                aria-hidden={i !== selectedIndex}
                tabIndex={i === selectedIndex ? 0 : -1}
                aria-label="Ampliar imagem do produto"
              >
                <img
                  src={img}
                  alt={`${productName} — ${imageLabels[i] ?? `Imagem ${i + 1}`}`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </a>
            ))}

            <div
              className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm pointer-events-none"
              style={{ background: badgeColor, fontFamily: "'Nunito', sans-serif" }}
            >
              {badge}
            </div>

            {discount != null && discount > 0 && (
              <div
                className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm pointer-events-none"
                style={{ background: "#E8821A", fontFamily: "'Nunito', sans-serif" }}
              >
                -{discount}%
              </div>
            )}

            <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />

            <div
              className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-[#3D2B1F] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm pointer-events-none"
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-[#E8D5C4] flex items-center justify-center text-[#3D2B1F] hover:bg-white hover:text-[#C4522A] shadow-md opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-[#E8D5C4] flex items-center justify-center text-[#3D2B1F] hover:bg-white hover:text-[#C4522A] shadow-md opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight size={20} />
                </button>
                <div
                  className="absolute bottom-4 left-4 z-20 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-white pointer-events-none"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  {selectedIndex + 1} / {total}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnails — horizontal no mobile */}
      {hasMultiple && (
        <div className="flex md:hidden gap-2 mt-3 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                selectedIndex === i ? "border-[#C4522A]" : "border-[#E8D5C4] opacity-70"
              }`}
              aria-label={imageLabels[i] ?? `Imagem ${i + 1}`}
            >
              <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
