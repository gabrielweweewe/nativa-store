import AdminLayout from "@/components/admin/AdminLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminApiError, bulkImportProducts, type BulkImportResponse } from "@/lib/adminApi";
import { fetchProducts } from "@/lib/products";
import { mapImportRow, type ImportRowResult } from "@shared/lib/importProductsMapper";
import type { ProductInput } from "@shared/schemas/product";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCcw,
  Upload,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type RowStatus = "novo" | "atualizacao" | "erro";

interface PreviewRow extends ImportRowResult {
  status: RowStatus;
}

export default function AdminProductImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResponse | null>(null);

  const validRows = useMemo(() => rows.filter((r) => r.status !== "erro"), [rows]);
  const importableRows = useMemo(
    () => validRows.filter((r) => updateExisting || r.status !== "atualizacao"),
    [validRows, updateExisting],
  );
  const errorCount = rows.length - validRows.length;

  async function handleFile(file: File) {
    setIsParsing(true);
    setResult(null);
    setFileName(file.name);

    try {
      const [existingProducts, buffer] = await Promise.all([fetchProducts(), file.arrayBuffer()]);
      const existingSlugs = new Set(existingProducts.map((p) => p.slug));

      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        toast.error("A planilha está vazia");
        setIsParsing(false);
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (rawRows.length === 0) {
        toast.error("Nenhuma linha encontrada na planilha");
        setIsParsing(false);
        return;
      }

      const mapped: PreviewRow[] = rawRows.map((raw, index) => {
        const mappedRow = mapImportRow(raw, index + 2); // +2: linha 1 é o cabeçalho

        if (mappedRow.errors.length > 0 || !mappedRow.data) {
          return { ...mappedRow, status: "erro" as const };
        }

        const status: RowStatus = existingSlugs.has(mappedRow.data.slug) ? "atualizacao" : "novo";
        return { ...mappedRow, status };
      });

      setRows(mapped);
    } catch (error) {
      toast.error("Não foi possível ler o arquivo. Verifique se é um CSV ou XLSX válido.");
      setRows([]);
    } finally {
      setIsParsing(false);
    }
  }

  function handleReset() {
    setRows([]);
    setFileName("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImport() {
    if (importableRows.length === 0) return;
    setIsImporting(true);

    try {
      const products: ProductInput[] = importableRows.map((r) => r.data as ProductInput);
      const response = await bulkImportProducts(products);
      setResult(response);
      toast.success(`Importação concluída: ${response.created} criado(s), ${response.updated} atualizado(s)`);
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Não foi possível importar os produtos");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <AdminLayout title="Importação em massa">
      <div className="flex flex-col gap-4">
        <Alert>
          <FileSpreadsheet />
          <AlertTitle>Como funciona</AlertTitle>
          <AlertDescription>
            <p>
              Baixe o modelo, preencha no Excel ou Google Sheets e envie o arquivo (.csv ou .xlsx) abaixo.
              Você poderá revisar cada linha antes de confirmar a importação.
            </p>
            <p>
              Veja as instruções completas em{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/importacao-em-massa.md</code>.
            </p>
          </AlertDescription>
        </Alert>

        <Card className="border-[#E8D5C4]">
          <CardHeader>
            <CardTitle>1. Baixe o modelo e envie sua planilha</CardTitle>
            <CardDescription>Colunas aceitas: nome, categoria, preco, imagens (separadas por |), entre outras.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="outline" asChild className="border-[#C4522A]/40 text-[#C4522A] hover:bg-[#C4522A]/10">
              <a href="/templates/modelo-importacao-produtos.csv" download>
                <Download className="size-4" />
                Baixar modelo CSV
              </a>
            </Button>

            <Button
              type="button"
              className="nativa-btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              {isParsing ? <Spinner className="size-4" /> : <Upload className="size-4" />}
              {fileName ? "Trocar arquivo" : "Enviar planilha"}
            </Button>

            {fileName && (
              <div className="flex items-center gap-2 text-sm text-[#8B6F5E]">
                <FileSpreadsheet className="size-4" />
                {fileName}
                <Button type="button" variant="ghost" size="icon-sm" onClick={handleReset} title="Remover">
                  <RefreshCcw className="size-4" />
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              hidden
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <>
            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle>2. Revise a pré-visualização</CardTitle>
                <CardDescription>
                  {rows.length} linha(s) encontrada(s) · {validRows.length} válida(s) · {errorCount} com erro
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-lg border border-[#E8D5C4] p-3">
                  <div>
                    <p className="text-sm font-medium text-[#3D2B1F]">
                      Atualizar produtos existentes (mesmo slug)
                    </p>
                    <p className="text-xs text-[#8B6F5E]">
                      Se desligado, linhas que já existem na loja serão ignoradas na importação.
                    </p>
                  </div>
                  <Switch checked={updateExisting} onCheckedChange={setUpdateExisting} />
                </div>

                <div className="max-h-[420px] overflow-y-auto rounded-lg border border-[#E8D5C4]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Linha</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => {
                        const willImport =
                          row.status !== "erro" && (updateExisting || row.status !== "atualizacao");

                        return (
                          <TableRow key={row.row} className={!willImport ? "opacity-60" : ""}>
                            <TableCell>{row.row}</TableCell>
                            <TableCell className="max-w-[220px] truncate font-medium text-[#3D2B1F]">
                              {row.data?.name ?? "—"}
                            </TableCell>
                            <TableCell>{row.data?.category ?? "—"}</TableCell>
                            <TableCell>
                              {row.data ? row.data.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                            </TableCell>
                            <TableCell>
                              {row.status === "erro" && (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="size-3" />
                                  Erro
                                </Badge>
                              )}
                              {row.status === "novo" && (
                                <Badge className="gap-1 bg-[#2D6A4F] text-white">
                                  <CheckCircle2 className="size-3" />
                                  Novo
                                </Badge>
                              )}
                              {row.status === "atualizacao" && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-[#E8821A] text-[#E8821A]"
                                >
                                  <RefreshCcw className="size-3" />
                                  {updateExisting ? "Atualização" : "Ignorado (existe)"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[280px] text-xs text-[#8B6F5E]">
                              {row.errors.length > 0 ? row.errors.join(" · ") : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle>3. Confirmar importação</CardTitle>
                <CardDescription>
                  {importableRows.length} produto(s) serão importados
                  {!updateExisting && validRows.length !== importableRows.length
                    ? ` (${validRows.length - importableRows.length} ignorado(s) por já existirem)`
                    : ""}
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Button
                  onClick={handleImport}
                  disabled={importableRows.length === 0 || isImporting}
                  className="nativa-btn-primary w-fit"
                >
                  {isImporting ? <Spinner className="size-4" /> : <Upload className="size-4" />}
                  Importar {importableRows.length} produto(s)
                </Button>

                {result && (
                  <Alert>
                    {result.errors.length > 0 ? <AlertTriangle /> : <CheckCircle2 />}
                    <AlertTitle>Resultado da importação</AlertTitle>
                    <AlertDescription>
                      <p>
                        {result.created} produto(s) criado(s), {result.updated} atualizado(s) de{" "}
                        {result.total} enviado(s).
                      </p>
                      {result.errors.length > 0 && (
                        <p className="text-destructive">
                          {result.errors.length} linha(s) foram rejeitadas pelo servidor.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
