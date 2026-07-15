import ProductCard from "@/components/ProductCard";
import ShareResultCard from "@/components/QuizCuradoria/ShareResultCard";
import {
  captureShareCard,
  downloadShareImage,
  shareOrDownloadImage,
} from "@/components/QuizCuradoria/shareQuizResult";
import type { QuizPublicResultPayload } from "@shared/types/quiz";
import { AnimatePresence, motion } from "framer-motion";
import { Download, RefreshCw, Share2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ResultScreenProps {
  payload: QuizPublicResultPayload;
  onRestart: () => void;
}

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
      // Garante que as imagens remotas tenham tempo de pintar no DOM offscreen
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
    toast.success("Imagem baixada");
  }

  async function handleNativeShare() {
    const blob = await ensureImage();
    if (!blob) return;

    try {
      const mode = await shareOrDownloadImage(
        blob,
        filename,
        `Meu estilo no quiz Nativa: ${payload.result.name}`,
      );
      if (mode === "shared") {
        toast.success("Compartilhado!");
      } else {
        toast.success("Imagem baixada (compartilhamento indisponível neste navegador)");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível compartilhar");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6"
    >
      <p
        className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em]"
        style={{ color: "#8B6F5E", fontFamily: "'Nunito', sans-serif" }}
      >
        Seu perfil de estilo
      </p>

      <h1
        className="mb-5 text-center text-4xl leading-tight sm:text-5xl"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "#3D2B1F",
        }}
      >
        {payload.result.name}
      </h1>

      <p
        className="mx-auto mb-10 max-w-xl text-center text-base leading-relaxed sm:text-lg"
        style={{ color: "#5C4A3D", fontFamily: "'Lora', Georgia, serif" }}
      >
        {payload.result.description}
      </p>

      {payload.products.length > 0 ? (
        <div className="mb-10">
          <h2
            className="mb-5 text-center text-sm font-semibold uppercase tracking-wider"
            style={{ color: "#8B6F5E", fontFamily: "'Nunito', sans-serif" }}
          >
            Peças recomendadas para você
          </h2>
          <div
            className={`grid gap-6 ${
              payload.products.length === 1
                ? "mx-auto max-w-xs grid-cols-1"
                : "grid-cols-1 sm:grid-cols-2"
            }`}
          >
            {payload.products.map((product) => (
              <ProductCard key={product.id} product={product} variant="compact" />
            ))}
          </div>
        </div>
      ) : (
        <p className="mb-10 text-center text-sm" style={{ color: "#8B6F5E" }}>
          Em breve indicaremos peças para este perfil.
        </p>
      )}

      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
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
          <Share2 className="size-4" />
          {isGenerating ? "Gerando imagem…" : "Compartilhar resultado"}
        </button>
      </div>

      <AnimatePresence>
        {showShareActions && shareBlob && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row"
          >
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
