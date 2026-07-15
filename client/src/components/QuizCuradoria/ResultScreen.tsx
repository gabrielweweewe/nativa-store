import ProductCard from "@/components/ProductCard";
import RevealBurst from "@/components/QuizCuradoria/RevealBurst";
import ShareResultCard from "@/components/QuizCuradoria/ShareResultCard";
import {
  buildQuizShareCaption,
  captureShareCard,
  copyShareCaption,
  downloadShareImage,
  shareOrDownloadImage,
} from "@/components/QuizCuradoria/shareQuizResult";
import type { QuizPublicResultPayload } from "@shared/types/quiz";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Download, Instagram, RefreshCw, Share2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ResultScreenProps {
  payload: QuizPublicResultPayload;
  onRestart: () => void;
}

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.16, delayChildren: 0.12 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 22, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function ResultScreen({ payload, onRestart }: ResultScreenProps) {
  const shareRef = useRef<HTMLDivElement>(null);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShareActions, setShowShareActions] = useState(false);

  const primaryProduct = payload.products[0] ?? null;
  const filename = `nativa-quiz-${payload.result.id}.png`;

  async function ensureImage(): Promise<Blob | null> {
    if (shareBlob) return shareBlob;
    if (!shareRef.current || !primaryProduct) {
      toast.error("Não há produto para montar a imagem de compartilhamento");
      return null;
    }

    setIsGenerating(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      const blob = await captureShareCard(shareRef.current);
      setShareBlob(blob);
      return blob;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar imagem");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleShareClick() {
    const blob = await ensureImage();
    if (!blob) return;
    setShowShareActions(true);
  }

  async function handleDownload() {
    const blob = await ensureImage();
    if (!blob) return;
    await downloadShareImage(blob, filename);
    toast.success("Imagem baixada — agora é só postar nos Stories!");
  }

  async function handleCopyCaption() {
    const ok = await copyShareCaption(payload.result.name);
    if (ok) {
      toast.success("Legenda copiada! Cole no Instagram com a imagem.");
    } else {
      toast.message(buildQuizShareCaption(payload.result.name));
    }
  }

  async function handleNativeShare() {
    const blob = await ensureImage();
    if (!blob) return;

    try {
      const mode = await shareOrDownloadImage(
        blob,
        filename,
        buildQuizShareCaption(payload.result.name),
      );
      if (mode === "shared") {
        toast.success("Manda nos Stories e marca a @nativastore!");
      } else {
        toast.success("Imagem baixada — posta nos Stories e marca a gente!");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível compartilhar");
    }
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="relative mx-auto w-full max-w-3xl px-4 pb-20 pt-2 sm:px-6"
    >
      {/* Hero de revelação — um foco só */}
      <motion.section
        variants={fadeUp}
        className="relative mb-12 overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-10 sm:py-14"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 30%, rgba(196,82,42,0.16) 0%, transparent 55%), linear-gradient(165deg, #FFF8F0 0%, #F5E6D6 100%)",
          boxShadow: "0 24px 60px rgba(61,43,31,0.08)",
        }}
      >
        <RevealBurst />

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
          className="relative z-[1] mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
          style={{
            background: "rgba(196,82,42,0.12)",
            color: "#C4522A",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          <Sparkles className="size-3.5" />
          <span className="text-xs font-bold uppercase tracking-[0.18em]">Revelado</span>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="relative z-[1] mb-3 text-xs font-semibold uppercase tracking-[0.22em]"
          style={{ color: "#8B6F5E", fontFamily: "'Nunito', sans-serif" }}
        >
          Seu perfil de estilo
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, scale: 0.88, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-[1] mb-5 text-4xl leading-[1.1] sm:text-6xl"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "#3D2B1F",
            textShadow: "0 2px 40px rgba(196,82,42,0.15)",
          }}
        >
          {payload.result.name}
        </motion.h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="relative z-[1] mx-auto mb-6 h-0.5 w-16 origin-center"
          style={{ background: "linear-gradient(90deg, transparent, #C4522A, transparent)" }}
        />

        <motion.p
          variants={fadeUp}
          className="relative z-[1] mx-auto max-w-lg text-base leading-relaxed sm:text-lg"
          style={{ color: "#5C4A3D", fontFamily: "'Lora', Georgia, serif" }}
        >
          {payload.result.description}
        </motion.p>
      </motion.section>

      {payload.products.length > 0 ? (
        <motion.div variants={fadeUp} className="mb-12">
          <h2
            className="mb-2 text-center text-sm font-semibold uppercase tracking-wider"
            style={{ color: "#8B6F5E", fontFamily: "'Nunito', sans-serif" }}
          >
            Feitas pra você
          </h2>
          <p
            className="mb-6 text-center text-sm"
            style={{ color: "#5C4A3D", fontFamily: "'Lora', Georgia, serif" }}
          >
            Sua recompensa: peças que combinam com essa energia.
          </p>
          <div
            className={`grid gap-6 ${
              payload.products.length === 1
                ? "mx-auto max-w-xs grid-cols-1"
                : "grid-cols-1 sm:grid-cols-2"
            }`}
          >
            {payload.products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.12, duration: 0.45 }}
              >
                <ProductCard product={product} variant="compact" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.p
          variants={fadeUp}
          className="mb-12 text-center text-sm"
          style={{ color: "#8B6F5E" }}
        >
          Em breve indicaremos peças para este perfil.
        </motion.p>
      )}

      <motion.div
        variants={fadeUp}
        className="mb-5 rounded-2xl px-5 py-4 text-center"
        style={{ background: "rgba(196,82,42,0.08)" }}
      >
        <p
          className="text-sm leading-relaxed sm:text-base"
          style={{ color: "#5C4A3D", fontFamily: "'Lora', Georgia, serif" }}
        >
          Gostou do resultado? Posta nos Stories, marca{" "}
          <span className="font-semibold" style={{ color: "#C4522A" }}>
            @nativastore
          </span>{" "}
          e desafia as amigas a descobrirem o estilo delas.
        </p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
      >
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center justify-center gap-2 rounded-full border-2 px-7 py-3.5 text-sm font-bold transition-opacity hover:opacity-90"
          style={{
            borderColor: "#C4522A",
            color: "#C4522A",
            fontFamily: "'Nunito', sans-serif",
            background: "transparent",
          }}
        >
          <RefreshCw className="size-4" />
          Refazer quiz
        </button>

        <button
          type="button"
          onClick={() => void handleShareClick()}
          disabled={isGenerating || !primaryProduct}
          className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #C4522A, #E8821A)",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          <Instagram className="size-4" />
          {isGenerating ? "Gerando imagem…" : "Postar no Instagram"}
        </button>
      </motion.div>

      <AnimatePresence>
        {showShareActions && shareBlob && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 space-y-3"
          >
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleDownload()}
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                style={{
                  background: "#EDE4D8",
                  color: "#3D2B1F",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                <Download className="size-4" />
                Baixar imagem
              </button>
              <button
                type="button"
                onClick={() => void handleCopyCaption()}
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                style={{
                  background: "#FFF8F0",
                  color: "#C4522A",
                  border: "1px solid rgba(196,82,42,0.35)",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                <Copy className="size-4" />
                Copiar legenda
              </button>
              <button
                type="button"
                onClick={() => void handleNativeShare()}
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
                style={{
                  background: "#2D6A4F",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                <Share2 className="size-4" />
                Compartilhar
              </button>
            </div>
            <p
              className="text-center text-xs leading-relaxed"
              style={{ color: "#8B6F5E", fontFamily: "'Nunito', sans-serif" }}
            >
              Dica: no Instagram, sobe a imagem nos Stories e cola a legenda — o link do quiz já
              aparece na arte.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {primaryProduct && (
        <ShareResultCard
          ref={shareRef}
          profileName={payload.result.name}
          productName={primaryProduct.name}
          productImage={primaryProduct.image}
        />
      )}
    </motion.div>
  );
}
