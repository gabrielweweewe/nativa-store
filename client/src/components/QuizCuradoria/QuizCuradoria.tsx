import QuestionCard from "@/components/QuizCuradoria/QuestionCard";
import ResultScreen from "@/components/QuizCuradoria/ResultScreen";
import { Spinner } from "@/components/ui/spinner";
import { useQuiz } from "@/hooks/useQuiz";
import { AnimatePresence, motion } from "framer-motion";

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
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <Spinner className="size-8 text-[#C4522A]" />
        <p style={{ color: "#8B6F5E", fontFamily: "'Nunito', sans-serif" }}>
          Revelando seu estilo…
        </p>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const remaining = questions.length - currentIndex;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4 sm:px-6">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#8B6F5E", fontFamily: "'Nunito', sans-serif" }}
        >
          <span>
            Pergunta {currentIndex + 1} de {questions.length}
          </span>
          <span>
            {remaining === 1 ? "Última pergunta" : `${remaining} restantes`}
          </span>
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
