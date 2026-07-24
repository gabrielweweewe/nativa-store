import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Accessibility,
  Contrast,
  Link2,
  RotateCcw,
  Type,
  X,
} from "lucide-react";
import { useAccessibility, type FontScale } from "@/contexts/AccessibilityContext";

const FONT_LABEL: Record<FontScale, string> = {
  normal: "Normal",
  large: "Grande",
  xlarge: "Extra",
};

/**
 * Painel de acessibilidade WCAG — canto inferior esquerdo.
 * Mantém a paleta Nativa; só reforça contraste/legibilidade sob demanda.
 */
export default function AccessibilityToolbar() {
  const [location] = useLocation();
  const isAdmin = location === "/admin" || location.startsWith("/admin/");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    highContrast,
    fontScale,
    underlineLinks,
    toggleHighContrast,
    cycleFontScale,
    toggleUnderlineLinks,
    resetPreferences,
  } = useAccessibility();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (panelRef.current && target && !panelRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  if (isAdmin) return null;

  return (
    <div
      ref={panelRef}
      className="nativa-a11y-root fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-4 z-[46] sm:bottom-8 sm:left-6"
    >
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-label="Opções de acessibilidade"
          className="nativa-a11y-panel mb-3 w-[min(18.5rem,calc(100vw-2rem))] rounded-2xl border border-[#C4522A]/20 bg-[#F5F0E8] p-4 shadow-[0_12px_40px_rgba(61,43,31,0.18)]"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p
                className="text-sm font-semibold text-[#3D2B1F]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                Acessibilidade
              </p>
              <p className="mt-0.5 text-xs text-[#8B6F5E]">
                Ajustes alinhados às diretrizes WCAG
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-[#8B6F5E] transition-colors hover:bg-[#C4522A]/10 hover:text-[#3D2B1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4522A]"
              aria-label="Fechar painel de acessibilidade"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <ToolbarToggle
              pressed={highContrast}
              onClick={toggleHighContrast}
              icon={<Contrast className="size-4" aria-hidden />}
              label="Alto contraste"
              hint={highContrast ? "Ativado" : "Desativado"}
            />
            <ToolbarToggle
              pressed={fontScale !== "normal"}
              onClick={cycleFontScale}
              icon={<Type className="size-4" aria-hidden />}
              label="Tamanho do texto"
              hint={FONT_LABEL[fontScale]}
            />
            <ToolbarToggle
              pressed={underlineLinks}
              onClick={toggleUnderlineLinks}
              icon={<Link2 className="size-4" aria-hidden />}
              label="Sublinhar links"
              hint={underlineLinks ? "Ativado" : "Desativado"}
            />
            <button
              type="button"
              onClick={resetPreferences}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#C4522A]/15 bg-transparent px-3 py-2.5 text-xs font-semibold text-[#8B6F5E] transition-colors hover:border-[#C4522A]/35 hover:text-[#3D2B1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4522A]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Restaurar padrão
            </button>
          </div>

          <p className="mt-3 text-[0.65rem] leading-relaxed text-[#8B6F5E]/90">
            Use o botão VLibras (lado esquerdo) para tradução em Libras.
          </p>
        </div>
      )}

      <button
        type="button"
        className="nativa-a11y-fab group flex size-12 items-center justify-center rounded-full text-white outline-none transition-transform duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#C4522A]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E8] sm:size-14"
        aria-label={open ? "Fechar acessibilidade" : "Abrir acessibilidade"}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title="Acessibilidade"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Accessibility className="relative size-6 drop-shadow-sm sm:size-7" aria-hidden />
      </button>
    </div>
  );
}

function ToolbarToggle({
  pressed,
  onClick,
  icon,
  label,
  hint,
}: {
  pressed: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4522A] ${
        pressed
          ? "border-[#C4522A]/40 bg-[#C4522A]/10 text-[#3D2B1F]"
          : "border-[#C4522A]/12 bg-white/50 text-[#3D2B1F] hover:border-[#C4522A]/25"
      }`}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
          pressed ? "bg-[#C4522A] text-white" : "bg-[#C4522A]/10 text-[#C4522A]"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{label}</span>
        <span className="block text-[0.7rem] text-[#8B6F5E]">{hint}</span>
      </span>
    </button>
  );
}
