import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  AdminApiError,
  fetchMetaCatalogStatus,
  testMetaCatalogFeed,
  updateMetaCatalogSettings,
} from "@/lib/adminApi";
import type {
  MetaCatalogAdminStatus,
  MetaCatalogSettingsInput,
  MetaCatalogTestResult,
} from "@shared/types/metaCatalog";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Facebook,
  RefreshCw,
  Save,
  TestTube2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type FormState = MetaCatalogSettingsInput;

function toForm(status: MetaCatalogAdminStatus): FormState {
  return {
    enabled: status.enabled,
    defaultBrand: status.defaultBrand,
    googleProductCategory: status.googleProductCategory,
  };
}

function formatGeneratedAt(value: string | null): string {
  if (!value) return "Ainda não gerado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Ainda não gerado";
  return date.toLocaleString("pt-BR");
}

export default function MetaCatalogIntegrationCard() {
  const [status, setStatus] = useState<MetaCatalogAdminStatus | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<MetaCatalogTestResult | null>(
    null
  );

  async function load() {
    setLoading(true);
    try {
      const data = await fetchMetaCatalogStatus();
      setStatus(data);
      setForm(toForm(data));
    } catch (error) {
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Erro ao carregar Instagram e Facebook"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      const data = await updateMetaCatalogSettings(form);
      setStatus(data);
      setForm(toForm(data));
      toast.success("Configurações salvas");
    } catch (error) {
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Erro ao salvar configurações"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateToken() {
    if (!form) return;
    setSaving(true);
    try {
      const data = await updateMetaCatalogSettings({
        ...form,
        regenerateFeedToken: true,
      });
      setStatus(data);
      setForm(toForm(data));
      toast.success("Novo token do feed gerado");
    } catch (error) {
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Erro ao regenerar token"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyFeedUrl() {
    if (!status?.feedUrl) return;
    try {
      await navigator.clipboard.writeText(status.feedUrl);
      toast.success("URL do feed copiada");
    } catch {
      toast.error("Não foi possível copiar a URL");
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testMetaCatalogFeed();
      setTestResult(result);
      const refreshed = await fetchMetaCatalogStatus();
      setStatus(refreshed);
      setForm(toForm(refreshed));
      toast.success(
        `Feed testado: ${result.included} no feed, ${result.excluded} excluídos`
      );
    } catch (error) {
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Erro ao testar o feed"
      );
    } finally {
      setTesting(false);
    }
  }

  if (loading || !form || !status) {
    return (
      <Card className="flex min-h-48 items-center justify-center border-[var(--admin-border)] p-8 shadow-[var(--admin-shadow)]">
        <Spinner className="size-6 text-[var(--admin-accent)]" />
      </Card>
    );
  }

  const badgeSynced = status.enabled && status.synced;

  return (
    <Card className="overflow-hidden border-[var(--admin-border)] shadow-[var(--admin-shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--admin-border)] px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5">
            <Facebook className="size-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--admin-text)]">
              Catálogo de produtos
            </h3>
            <p className="mt-0.5 text-sm text-[var(--admin-text-muted)]">
              Feed XML para Instagram Shopping e Facebook Shops.
            </p>
          </div>
        </div>
        <span
          className={
            badgeSynced
              ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
              : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
          }
        >
          {badgeSynced ? (
            <>
              <CheckCircle2 className="size-3" />
              Sincronizado
            </>
          ) : status.enabled ? (
            "Ativo"
          ) : (
            "Não configurado"
          )}
        </span>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-rose-100 bg-rose-50/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
              Sem imagem/preço
            </p>
            <p className="mt-1 text-2xl font-bold text-rose-800">
              {status.excludedCount}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              No feed
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">
              {status.productCount}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--admin-text)]">
              Ativar integração
            </p>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Quando ativo, o Meta consegue ler o feed periodicamente.
            </p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={checked =>
              setForm(current =>
                current ? { ...current, enabled: checked } : current
              )
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="meta-brand">Marca padrão</Label>
            <Input
              id="meta-brand"
              value={form.defaultBrand}
              onChange={event =>
                setForm(current =>
                  current
                    ? { ...current, defaultBrand: event.target.value }
                    : current
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta-category">Categoria Google / Meta</Label>
            <Input
              id="meta-category"
              placeholder="Ex.: Bolsas e acessórios"
              value={form.googleProductCategory}
              onChange={event =>
                setForm(current =>
                  current
                    ? {
                        ...current,
                        googleProductCategory: event.target.value,
                      }
                    : current
                )
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>URL do feed</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              readOnly
              value={status.feedUrl}
              className="font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void handleCopyFeedUrl()}
              >
                <Copy className="size-4" />
                Copiar URL
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void handleRegenerateToken()}
                disabled={saving}
              >
                <RefreshCw className="size-4" />
                Novo token
              </Button>
            </div>
          </div>
          <p className="text-xs text-[var(--admin-text-muted)]">
            Última geração: {formatGeneratedAt(status.lastGeneratedAt)}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] px-4 py-3 text-sm leading-relaxed text-[var(--admin-text-secondary)]">
          <p className="font-semibold text-[var(--admin-text)]">Como conectar</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Copie a URL do feed.</li>
            <li>
              No Commerce Manager, abra o catálogo → Fontes de dados → Adicionar
              produtos.
            </li>
            <li>
              Escolha <strong>Arquivo de dados</strong> (não é um item separado
              chamado “feed programado”).
            </li>
            <li>
              Em seguida selecione <strong>Usar uma URL</strong>, cole o link do
              feed e defina a atualização (ex.: diária).
            </li>
          </ol>
          <a
            href="https://business.facebook.com/commerce/"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--admin-accent)] hover:underline"
          >
            Abrir Meta Commerce Manager
            <ExternalLink className="size-3.5" />
          </a>
        </div>

        {testResult && (
          <div className="space-y-3 rounded-xl border border-[var(--admin-border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--admin-text)]">
              Resultado do teste
            </p>
            <p className="text-sm text-[var(--admin-text-secondary)]">
              {testResult.included} produtos no feed · {testResult.excluded}{" "}
              excluídos
            </p>
            {testResult.exclusions.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-[var(--admin-text-muted)]">
                {testResult.exclusions.map(item => (
                  <li key={`${item.id}-${item.reason}`}>
                    <span className="font-medium text-[var(--admin-text)]">
                      {item.name}
                    </span>{" "}
                    ({item.id}) — {item.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-[var(--admin-border)] pt-4">
          <Button
            type="button"
            className="gap-2"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <Spinner className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void handleTest()}
            disabled={testing}
          >
            {testing ? (
              <Spinner className="size-4" />
            ) : (
              <TestTube2 className="size-4" />
            )}
            Testar feed
          </Button>
        </div>
      </div>
    </Card>
  );
}
