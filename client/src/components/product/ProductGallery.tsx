import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  useEffect(() => {
    if (!lightboxOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, goPrev, goNext]);

  if (total === 0) return null;

  const currentLabel = imageLabels[selectedIndex] ?? `Imagem ${selectedIndex + 1}`;

  return (
    <>
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

        {/* Imagem principal */}
        <div className="flex-1 min-w-0 order-1 md:order-2">
          <div
            className="group relative rounded-2xl overflow-hidden bg-white border border-[#E8D5C4] aspect-[4/5] shadow-sm cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setLightboxOpen(true);
              }
            }}
            aria-label="Ampliar imagem do produto"
          >
            <img
              src={images[selectedIndex]}
              alt={`${productName} — ${currentLabel}`}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />

            <div
              className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm"
              style={{ background: badgeColor, fontFamily: "'Nunito', sans-serif" }}
            >
              {badge}
            </div>

            {discount != null && discount > 0 && (
              <div
                className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm"
                style={{ background: "#E8821A", fontFamily: "'Nunito', sans-serif" }}
              >
                -{discount}%
              </div>
            )}

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-[#3D2B1F] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              <ZoomIn size={14} className="text-[#C4522A]" />
              Ampliar
            </div>

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-[#E8D5C4] flex items-center justify-center text-[#3D2B1F] hover:bg-white hover:text-[#C4522A] shadow-md opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-[#E8D5C4] flex items-center justify-center text-[#3D2B1F] hover:bg-white hover:text-[#C4522A] shadow-md opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight size={20} />
                </button>
                <div
                  className="absolute bottom-4 left-4 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-white"
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

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-[min(96vw,1100px)] w-full p-0 gap-0 border-none bg-[#1a1410]/95 overflow-hidden [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:right-3"
          showCloseButton
        >
          <DialogTitle className="sr-only">{productName} — galeria de imagens</DialogTitle>

          <div className="relative flex items-center justify-center min-h-[50vh] md:min-h-[70vh] p-4 md:p-8">
            <img
              src={images[selectedIndex]}
              alt={`${productName} — ${currentLabel}`}
              className="max-h-[75vh] max-w-full object-contain rounded-lg"
            />

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {hasMultiple && (
            <div className="flex gap-2 justify-center px-4 pb-4 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedIndex === i ? "border-[#C4522A]" : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
