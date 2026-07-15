import {
  quizImportBodySchema,
  quizQuestionSchema,
  quizResultSchema,
  type QuizQuestionInput,
  type QuizResultInput,
} from "@shared/schemas/quiz";
import type { QuizImportError } from "@shared/types/quiz";
import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import { exportQuiz, importQuiz, listQuizQuestions, listQuizResults } from "../services/quiz";

const router = Router();

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const [questions, results] = await Promise.all([listQuizQuestions(), listQuizResults()]);
    res.json({ questions, results });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar quiz",
    });
  }
});

router.get("/export", requireAdmin, async (_req, res) => {
  try {
    const payload = await exportQuiz();
    res.json(payload);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao exportar quiz",
    });
  }
});

router.post("/import", requireAdmin, async (req, res) => {
  try {
    const bodyParsed = quizImportBodySchema.safeParse(req.body);

    if (!bodyParsed.success) {
      res.status(400).json({
        error: "Envie um objeto com arrays 'questions' e 'results'",
        issues: bodyParsed.error.issues,
      });
      return;
    }

    const errors: QuizImportError[] = [];
    const validQuestions: QuizQuestionInput[] = [];
    const validResults: QuizResultInput[] = [];
    const seenQuestionIds = new Set<string>();
    const seenResultIds = new Set<string>();

    bodyParsed.data.questions.forEach((item, index) => {
      const parsed = quizQuestionSchema.safeParse(item);
      if (!parsed.success) {
        errors.push({ section: "questions", index, issues: parsed.error.issues });
        return;
      }

      if (seenQuestionIds.has(parsed.data.id)) {
        errors.push({
          section: "questions",
          index,
          issues: [{ message: `Id de pergunta duplicado no payload: ${parsed.data.id}` }],
        });
        return;
      }

      seenQuestionIds.add(parsed.data.id);
      validQuestions.push(parsed.data);
    });

    bodyParsed.data.results.forEach((item, index) => {
      const parsed = quizResultSchema.safeParse(item);
      if (!parsed.success) {
        errors.push({ section: "results", index, issues: parsed.error.issues });
        return;
      }

      if (seenResultIds.has(parsed.data.id)) {
        errors.push({
          section: "results",
          index,
          issues: [{ message: `Id de resultado duplicado no payload: ${parsed.data.id}` }],
        });
        return;
      }

      seenResultIds.add(parsed.data.id);
      validResults.push(parsed.data);
    });

    if (validQuestions.length === 0 && validResults.length === 0) {
      res.status(400).json({
        error: "Nenhum item válido para importar",
        questions: { created: 0, updated: 0 },
        results: { created: 0, updated: 0 },
        errors,
      });
      return;
    }

    const report = await importQuiz(validQuestions, validResults, errors);
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao importar quiz",
    });
  }
});

export default router;
