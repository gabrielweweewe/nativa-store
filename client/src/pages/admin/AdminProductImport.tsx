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
import {
  AdminApiError,
  bulkImportProducts,
  fetchTiendanubeImportImages,
  type BulkImportResponse,
} from "@/lib/adminApi";
import { fetchProducts } from "@/lib/products";
import {
  mapImportRow,
  mapTiendanubeImportRows,
  type ImportRowResult,
} from "@shared/lib/importProductsMapper";
import {
  isTiendanubeExportCsv,
  parseTiendanubeCsv,
} from "@shared/lib/parseTiendanubeCsv";
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

function withPreviewStatus(
  mappedRows: ImportRowResult[],
  existingSlugs: Set<string>,
): PreviewRow[] {
  return mappedRows.map((mappedRow) => {
    if (mappedRow.errors.length > 0 || !mappedRow.data) {
      return { ...mappedRow, status: "erro" as const };
    }
    const status: RowStatus = existingSlugs.has(mappedRow.data.slug) ? "atualizacao" : "novo";
    return { ...mappedRow, status };
  });
}

export default function AdminProductImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResponse | null>(null);
  const [sourceFormat, setSourceFormat] = useState<"nativa" | "tiendanube" | null>(null);

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
    setSourceFormat(null);

    try {
      const [existingProducts, buffer] = await Promise.all([fetchProducts(), file.arrayBuffer()]);
      const existingSlugs = new Set(existingProducts.map((p) => p.slug));
      const latin1Text = new TextDecoder("latin1").decode(buffer);

      if (file.name.toLowerCase().endsWith(".csv") && isTiendanubeExportCsv(latin1Text)) {
        const tiendaRows = parseTiendanubeCsv(latin1Text).filter((row) => row.slug && row.name);

        if (tiendaRows.length === 0) {
          toast.error("Nenhum produto encontrado no CSV da Tiendanube");
          setRows([]);
          return;
        }

        toast.message("CSV Tiendanube detectado — buscando imagens na loja…");
        const { images } = await fetchTiendanubeImportImages(tiendaRows.map((row) => row.slug));
        const mapped = withPreviewStatus(mapTiendanubeImportRows(tiendaRows, images), existingSlugs);
        setSourceFormat("tiendanube");
        setRows(mapped);
        return;
      }

      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        toast.error("A planilha está vazia");
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (rawRows.length === 0) {
        toast.error("Nenhuma linha encontrada na planilha");
        return;
      }

      const mapped = withPreviewStatus(
        rawRows.map((raw, index) => mapImportRow(raw, index + 2)),
        existingSlugs,
      );
      setSourceFormat("nativa");
      setRows(mapped);
    } catch (error) {
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Não foi possível ler o arquivo. Verifique se é um CSV ou XLSX válido.",
      );
      setRows([]);
    } finally {
      setIsParsing(false);
    }
  }

  function handleReset() {
    setRows([]);
    setFileName("");
    setResult(null);
    setSourceFormat(null);
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
              Baixe o modelo Nativa, preencha no Excel/Google Sheets e envie (.csv ou .xlsx).
              Também é possível enviar direto o CSV exportado da Tiendanube/Nuvemshop — as imagens
              são buscadas automaticamente nas páginas públicas dos produtos.
            </p>
            <p>
              Veja as instruções completas em{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/importacao-em-massa.md</code>.
            </p>
          </AlertDescription>
        </Alert>

        <Card className="border-[var(--admin-border)]">
          <CardHeader>
            <CardTitle>1. Baixe o modelo e envie sua planilha</CardTitle>
            <CardDescription>
              Aceita o modelo Nativa (nome, categoria, preco, imagens…) ou o CSV exportado da
              Tiendanube/Nuvemshop.
              {sourceFormat === "tiendanube" ? " · Formato detectado: Tiendanube" : ""}
              {sourceFormat === "nativa" ? " · Formato detectado: modelo Nativa" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="outline" asChild className="border-[var(--admin-accent)]/40 text-[var(--admin-accent)] hover:bg-[var(--admin-accent-soft)]">
              <a href="/templates/modelo-importacao-produtos.csv" download>
                <Download className="size-4" />
                Baixar modelo CSV
              </a>
            </Button>

            <Button
              type="button"
              className="admin-btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              {isParsing ? <Spinner className="size-4" /> : <Upload className="size-4" />}
              {fileName ? "Trocar arquivo" : "Enviar planilha"}
            </Button>

            {fileName && (
              <div className="flex items-center gap-2 text-sm text-[var(--admin-text-muted)]">
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
            <Card className="border-[var(--admin-border)]">
              <CardHeader>
                <CardTitle>2. Revise a pré-visualização</CardTitle>
                <CardDescription>
                  {rows.length} linha(s) encontrada(s) · {validRows.length} válida(s) · {errorCount} com erro
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] p-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--admin-text)]">
                      Atualizar produtos existentes (mesmo slug)
                    </p>
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      Se desligado, linhas que já existem na loja serão ignoradas na importação.
                    </p>
                  </div>
                  <Switch checked={updateExisting} onCheckedChange={setUpdateExisting} />
                </div>

                <div className="max-h-[420px] overflow-y-auto rounded-lg border border-[var(--admin-border)]">
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
                            <TableCell className="max-w-[220px] truncate font-medium text-[var(--admin-text)]">
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
                                <Badge className="gap-1 bg-[var(--admin-success)] text-white">
                                  <CheckCircle2 className="size-3" />
                                  Novo
                                </Badge>
                              )}
                              {row.status === "atualizacao" && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-amber-500 text-amber-600"
                                >
                                  <RefreshCcw className="size-3" />
                                  {updateExisting ? "Atualização" : "Ignorado (existe)"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[280px] text-xs text-[var(--admin-text-muted)]">
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

            <Card className="border-[var(--admin-border)]">
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
                  className="admin-btn-primary w-fit"
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
