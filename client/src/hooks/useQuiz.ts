import { fetchQuizQuestions, submitQuizResult } from "@/lib/quizApi";
import type { QuizPublicQuestion, QuizPublicResultPayload } from "@shared/types/quiz";
import { useCallback, useEffect, useState } from "react";

type QuizPhase = "loading" | "questions" | "calculating" | "result" | "error";

export function useQuiz() {
  const [phase, setPhase] = useState<QuizPhase>("loading");
  const [questions, setQuestions] = useState<QuizPublicQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [resultPayload, setResultPayload] = useState<QuizPublicResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setCurrentIndex(0);
    setSelectedOptionIds([]);
    setSelectedOptionId(null);
    setResultPayload(null);

    try {
      const data = await fetchQuizQuestions();
      if (data.length === 0) {
        setError("O quiz ainda não está disponível. Volte em breve.");
        setPhase("error");
        return;
      }
      setQuestions(data);
      setPhase("questions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar o quiz");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const finish = useCallback(async (answers: string[]) => {
    setPhase("calculating");
    try {
      const payload = await submitQuizResult(answers);
      setResultPayload(payload);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao calcular o resultado");
      setPhase("error");
    }
  }, []);

  const selectOption = useCallback(
    (optionId: string) => {
      if (phase !== "questions" || selectedOptionId) return;

      setSelectedOptionId(optionId);
      const nextAnswers = [...selectedOptionIds, optionId];
      setSelectedOptionIds(nextAnswers);

      window.setTimeout(() => {
        const isLast = currentIndex >= questions.length - 1;
        if (isLast) {
          void finish(nextAnswers);
          return;
        }
        setCurrentIndex((index) => index + 1);
        setSelectedOptionId(null);
      }, 320);
    },
    [phase, selectedOptionId, selectedOptionIds, currentIndex, questions.length, finish],
  );

  const restart = useCallback(() => {
    void load();
  }, [load]);

  const currentQuestion = questions[currentIndex] ?? null;
  const progress =
    questions.length === 0
      ? 0
      : phase === "result"
        ? 100
        : ((currentIndex + 1) / questions.length) * 100;

  return {
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
  };
}
