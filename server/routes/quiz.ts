import { quizResultRequestSchema } from "@shared/schemas/quiz";
import { Router } from "express";
import { computeQuizResult, getPublicQuizQuestions } from "../services/quiz";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const questions = await getPublicQuizQuestions();
    res.json({ questions });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar quiz",
    });
  }
});

router.post("/result", async (req, res) => {
  try {
    const parsed = quizResultRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Dados inválidos",
        issues: parsed.error.issues,
      });
      return;
    }

    const payload = await computeQuizResult(parsed.data.selectedOptionIds);
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao calcular resultado";
    const status = message.includes("Nenhum perfil") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
