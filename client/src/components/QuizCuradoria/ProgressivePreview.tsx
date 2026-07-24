/**
 * Prévia progressiva do resultado: silhueta de bolsa que ganha
 * mosaico/cores das opções já escolhidas.
 * Mobile: no fluxo, centralizada (não atravessa o título).
 * Desktop: canto flutuante discreto.
 */

import { motion, AnimatePresence } from "framer-motion";

export interface PreviewChoice {
  id: string;
  imageUrl: string;
  accentColor: string;
}

interface ProgressivePreviewProps {
  choices: PreviewChoice[];
  totalQuestions: number;
}

export default function ProgressivePreview({
  choices,
  totalQuestions,
}: ProgressivePreviewProps) {
  if (totalQuestions <= 0) return null;

  const filled = choices.length;
  const progress = Math.min(filled / totalQuestions, 1);

  return (
    <aside
      className="pointer-events-none relative z-20 mx-auto mb-5 flex justify-center md:fixed md:right-[max(0.75rem,env(safe-area-inset-right,0px))] md:top-[max(5.5rem,calc(env(safe-area-inset-top,0px)+4.5rem))] md:mb-0 md:justify-start"
      aria-hidden
    >
      <div className="flex flex-col items-center gap-1.5">
        <div
          className="relative h-12 w-10 overflow-hidden md:h-16 md:w-[52px]"
          style={{
            opacity: 0.42 + progress * 0.45,
            filter: `drop-shadow(0 2px 8px rgba(61,43,31,${0.06 + progress * 0.12}))`,
          }}
        >
          <svg
            viewBox="0 0 52 64"
            className="absolute inset-0 h-full w-full"
            style={{ zIndex: 2 }}
          >
            <path
              d="M18 16 C18 8 34 8 34 16"
              fill="none"
              stroke="#3D2B1F"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity={0.35 + progress * 0.4}
            />
            <path
              d="M10 22 C10 18 14 15 18 15 L34 15 C38 15 42 18 42 22 L44 54 C44 58 40 60 36 60 L16 60 C12 60 8 58 8 54 Z"
              fill="none"
              stroke="#3D2B1F"
              strokeWidth="1.75"
              opacity={0.4 + progress * 0.35}
            />
          </svg>

          <div
            className="absolute inset-0"
            style={{
              clipPath:
                "path('M10 22 C10 18 14 15 18 15 L34 15 C38 15 42 18 42 22 L44 54 C44 58 40 60 36 60 L16 60 C12 60 8 58 8 54 Z')",
              WebkitClipPath:
                "path('M10 22 C10 18 14 15 18 15 L34 15 C38 15 42 18 42 22 L44 54 C44 58 40 60 36 60 L16 60 C12 60 8 58 8 54 Z')",
              background: "#EDE4D8",
            }}
          >
            <div
              className="grid h-full w-full"
              style={{
                gridTemplateColumns: `repeat(${Math.max(filled, 1)}, 1fr)`,
              }}
            >
              <AnimatePresence initial={false}>
                {choices.map((choice) => (
                  <motion.div
                    key={choice.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="relative h-full min-h-0 overflow-hidden"
                    style={{ background: choice.accentColor }}
                  >
                    <img
                      src={choice.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ opacity: 0.72, mixBlendMode: "multiply" }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: choice.accentColor,
                        opacity: 0.28,
                        mixBlendMode: "color",
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <span
              key={i}
              className="block rounded-full transition-all duration-300"
              style={{
                width: i < filled ? 6 : 4,
                height: i < filled ? 6 : 4,
                background:
                  i < filled
                    ? choices[i]?.accentColor ?? "#C4522A"
                    : "rgba(61,43,31,0.18)",
              }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
