import AdminLayout from "@/components/admin/AdminLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminApiError,
  exportQuiz,
  fetchAdminQuiz,
  importQuiz,
} from "@/lib/adminApi";
import type { QuizExportPayload, QuizImportReport, QuizQuestion, QuizResult } from "@shared/types/quiz";
import { Download, RefreshCcw, Sparkles, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function AdminQuiz() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastReport, setLastReport] = useState<QuizImportReport | null>(null);

  const loadQuiz = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminQuiz();
      setQuestions(data.questions);
      setResults(data.results);
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Erro ao carregar quiz");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  async function handleFile(file: File) {
    setIsImporting(true);
    setLastReport(null);

    try {
      const text = await file.text();
      let parsed: unknown;

      try {
        parsed = JSON.parse(text);
      } catch {
        toast.error("Arquivo JSON inválido");
        return;
      }

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        (!Array.isArray((parsed as QuizExportPayload).questions) &&
          !Array.isArray((parsed as QuizExportPayload).results))
      ) {
        toast.error("O JSON deve conter arrays 'questions' e/ou 'results'");
        return;
      }

      const payload = parsed as QuizExportPayload;
      const report = await importQuiz({
        questions: Array.isArray(payload.questions) ? payload.questions : [],
        results: Array.isArray(payload.results) ? payload.results : [],
      });

      setLastReport(report);
      const created = report.questions.created + report.results.created;
      const updated = report.questions.updated + report.results.updated;
      const errorCount = report.errors.length;

      if (created + updated > 0) {
        toast.success(`Importação concluída: ${created} criados, ${updated} atualizados`);
      } else {
        toast.error("Nenhum item válido importado");
      }

      if (errorCount > 0) {
        toast.warning(`${errorCount} item(ns) com erro de validação`);
      }

      await loadQuiz();
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Erro ao importar quiz");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const payload = await exportQuiz();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `nativa-quiz-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("JSON exportado");
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Erro ao exportar quiz");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AdminLayout
      title="Quiz de Curadoria"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void loadQuiz()} disabled={isLoading}>
            <RefreshCcw className="size-4" />
            Atualizar
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleExport()} disabled={isExporting}>
            <Download className="size-4" />
            Exportar JSON
          </Button>
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <Upload className="size-4" />
            {isImporting ? "Importando…" : "Importar JSON"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              Importação em massa
            </CardTitle>
            <CardDescription>
              Envie um arquivo .json com arrays <code>questions</code> e <code>results</code>. Itens
              inválidos são reportados e pulados; o upsert usa o campo <code>id</code>.
            </CardDescription>
          </CardHeader>
          {lastReport && (
            <CardContent>
              <Alert>
                <AlertTitle>Última importação</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>
                    Perguntas: {lastReport.questions.created} criadas, {lastReport.questions.updated}{" "}
                    atualizadas
                  </p>
                  <p>
                    Resultados: {lastReport.results.created} criados, {lastReport.results.updated}{" "}
                    atualizados
                  </p>
                  {lastReport.errors.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {lastReport.errors.slice(0, 10).map((error) => (
                        <li key={`${error.section}-${error.index}`}>
                          [{error.section}] índice {error.index}:{" "}
                          {Array.isArray(error.issues)
                            ? error.issues
                                .map((issue) =>
                                  typeof issue === "object" &&
                                  issue !== null &&
                                  "message" in issue
                                    ? String((issue as { message: string }).message)
                                    : JSON.stringify(issue),
                                )
                                .join("; ")
                            : String(error.issues)}
                        </li>
                      ))}
                      {lastReport.errors.length > 10 && (
                        <li>…e mais {lastReport.errors.length - 10} erro(s)</li>
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-8" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Perguntas ({questions.length})</CardTitle>
                <CardDescription>Somente leitura — edite via JSON.</CardDescription>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma pergunta cadastrada.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Id</TableHead>
                        <TableHead>Pergunta</TableHead>
                        <TableHead className="text-right">Opções</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {questions.map((question) => (
                        <TableRow key={question.id}>
                          <TableCell>{question.order}</TableCell>
                          <TableCell className="font-mono text-xs">{question.id}</TableCell>
                          <TableCell>{question.text}</TableCell>
                          <TableCell className="text-right">{question.options.length}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resultados ({results.length})</CardTitle>
                <CardDescription>Perfis de estilo e produtos recomendados.</CardDescription>
              </CardHeader>
              <CardContent>
                {results.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum resultado cadastrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Id</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="text-right">Produtos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-mono text-xs">{result.id}</TableCell>
                          <TableCell>{result.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {result.tags.join(", ")}
                          </TableCell>
                          <TableCell className="text-right">
                            {result.recommendedProductIds.length}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
