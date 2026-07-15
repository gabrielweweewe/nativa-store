import QuestionCard from "@/components/QuizCuradoria/QuestionCard";
import ResultScreen from "@/components/QuizCuradoria/ResultScreen";
import { Spinner } from "@/components/ui/spinner";
import { useQuiz } from "@/hooks/useQuiz";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const REVEAL_LINES = [
  "Lendo suas escolhas…",
  "Cruzando texturas e vibes…",
  "Quase lá — preparando sua revelação…",
];

export default function QuizCuradoria() {
  const {
    phase,
    questions,
    currentQuestion,
    currentIndex,
    selectedOptionId,
    resultPayload,
    error,
    progress,
    selectOption,
    restart,
  } = useQuiz();

  const [revealLine, setRevealLine] = useState(0);

  useEffect(() => {
    if (phase !== "calculating") {
      setRevealLine(0);
      return;
    }
    const id = window.setInterval(() => {
      setRevealLine((prev) => (prev + 1) % REVEAL_LINES.length);
    }, 900);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "result") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [phase]);

  if (phase === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-8 text-[#C4522A]" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-6 text-base" style={{ color: "#5C4A3D", fontFamily: "'Lora', serif" }}>
          {error ?? "Algo deu errado."}
        </p>
        <button
          type="button"
          onClick={restart}
          className="rounded-full px-7 py-3 text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #C4522A, #E8821A)" }}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (phase === "result" && resultPayload) {
    return <ResultScreen payload={resultPayload} onRestart={restart} />;
  }

  if (phase === "calculating") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <motion.div
          className="relative flex size-20 items-center justify-center"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <span
            className="absolute inset-0 rounded-full opacity-30"
            style={{
              background: "radial-gradient(circle, #C4522A 0%, transparent 70%)",
            }}
          />
          <Spinner className="size-9 text-[#C4522A]" />
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.p
            key={revealLine}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="text-base sm:text-lg"
            style={{ color: "#5C4A3D", fontFamily: "'Lora', Georgia, serif" }}
          >
            {REVEAL_LINES[revealLine]}
          </motion.p>
        </AnimatePresence>
        <p
          className="text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "#C4522A", fontFamily: "'Nunito', sans-serif" }}
        >
          Recompensa chegando
        </p>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const remaining = questions.length - currentIndex;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
      <header className="mb-10 text-center">
        <p
          className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "#8B6F5E", fontFamily: "'Nunito', sans-serif" }}
        >
          Curadoria Nativa
        </p>
        <h1
          className="text-3xl sm:text-4xl"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "#3D2B1F",
          }}
        >
          Descubra sua bolsa ideal
        </h1>
        <p
          className="mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base"
          style={{ color: "#5C4A3D", fontFamily: "'Lora', Georgia, serif" }}
        >
          Responda com o coração — a gente recomenda peças com a sua vibe.
        </p>
      </header>

      <div className="mb-8">
        <div
          className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#8B6F5E", fontFamily: "'Nunito', sans-serif" }}
        >
          <span>
            Pergunta {currentIndex + 1} de {questions.length}
          </span>
          <span>{remaining === 1 ? "Última pergunta" : `${remaining} restantes`}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#EDE4D8]">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #C4522A, #E8821A)" }}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <h2
            className="mb-8 text-center text-2xl leading-snug sm:text-3xl"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "#3D2B1F",
            }}
          >
            {currentQuestion.text}
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {currentQuestion.options.map((option) => (
              <QuestionCard
                key={option.id}
                option={option}
                selected={selectedOptionId === option.id}
                disabled={!!selectedOptionId}
                onSelect={selectOption}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
