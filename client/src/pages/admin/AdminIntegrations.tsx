import AdminLayout from "@/components/admin/AdminLayout";
import MercadoPagoIntegrationCard from "@/components/admin/MercadoPagoIntegrationCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  AdminApiError,
  disconnectMelhorEnvio,
  fetchMelhorEnvioStatus,
  type MelhorEnvioAdminStatus,
  updateMelhorEnvioSettings,
} from "@/lib/adminApi";
import type { MelhorEnvioEnvironment } from "@shared/types/melhorEnvio";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2Off,
  Save,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type FormState = {
  environment: MelhorEnvioEnvironment;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  userAgent: string;
  originPostalCode: string;
  defaultWidthCm: string;
  defaultHeightCm: string;
  defaultLengthCm: string;
  defaultWeightKg: string;
  freeShippingEnabled: boolean;
  freeShippingThreshold: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  senderDocumentType: "cpf" | "cnpj";
  senderDocument: string;
  senderStateRegister: string;
  senderAddress: string;
  senderNumber: string;
  senderComplement: string;
  senderDistrict: string;
  senderCity: string;
  senderStateAbbr: string;
};

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function toForm(status: MelhorEnvioAdminStatus): FormState {
  return {
    environment: status.environment,
    clientId: status.clientId,
    clientSecret: "",
    redirectUri: status.redirectUri || status.suggestedRedirectUri,
    userAgent: status.userAgent,
    originPostalCode: formatCep(status.originPostalCode),
    defaultWidthCm: String(status.defaultWidthCm),
    defaultHeightCm: String(status.defaultHeightCm),
    defaultLengthCm: String(status.defaultLengthCm),
    defaultWeightKg: String(status.defaultWeightKg),
    freeShippingEnabled: status.freeShippingEnabled,
    freeShippingThreshold: String(status.freeShippingThreshold),
    senderName: status.senderName,
    senderEmail: status.senderEmail,
    senderPhone: status.senderPhone,
    senderDocumentType: status.senderDocumentType,
    senderDocument: status.senderDocument,
    senderStateRegister: status.senderStateRegister,
    senderAddress: status.senderAddress,
    senderNumber: status.senderNumber,
    senderComplement: status.senderComplement,
    senderDistrict: status.senderDistrict,
    senderCity: status.senderCity,
    senderStateAbbr: status.senderStateAbbr,
  };
}

function formatExpiresAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export default function AdminIntegrations() {
  const [status, setStatus] = useState<MelhorEnvioAdminStatus | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("me_connected");
    const error = params.get("me_error");

    if (connected === "1") {
      toast.success("Melhor Envio conectado com sucesso");
    }
    if (error) {
      toast.error(error);
    }

    if (connected || error) {
      const url = new URL(window.location.href);
      url.searchParams.delete("me_connected");
      url.searchParams.delete("me_error");
      window.history.replaceState({}, "", url.pathname);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchMelhorEnvioStatus();
        if (cancelled) return;
        setStatus(data);
        setForm(toForm(data));
      } catch (error) {
        toast.error(
          error instanceof AdminApiError
            ? error.message
            : "Erro ao carregar integração Melhor Envio"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    setSaving(true);
    try {
      const data = await updateMelhorEnvioSettings({
        environment: form.environment,
        clientId: form.clientId.trim(),
        clientSecret: form.clientSecret.trim() || undefined,
        redirectUri: form.redirectUri.trim(),
        userAgent: form.userAgent.trim(),
        originPostalCode: form.originPostalCode,
        defaultWidthCm: Number(form.defaultWidthCm),
        defaultHeightCm: Number(form.defaultHeightCm),
        defaultLengthCm: Number(form.defaultLengthCm),
        defaultWeightKg: Number(form.defaultWeightKg),
        freeShippingEnabled: form.freeShippingEnabled,
        freeShippingThreshold: Number(form.freeShippingThreshold),
        senderName: form.senderName,
        senderEmail: form.senderEmail,
        senderPhone: form.senderPhone,
        senderDocumentType: form.senderDocumentType,
        senderDocument: form.senderDocument,
        senderStateRegister: form.senderStateRegister,
        senderAddress: form.senderAddress,
        senderNumber: form.senderNumber,
        senderComplement: form.senderComplement,
        senderDistrict: form.senderDistrict,
        senderCity: form.senderCity,
        senderStateAbbr: form.senderStateAbbr,
      });
      setStatus(data);
      setForm(toForm(data));
      toast.success("Configurações salvas");
    } catch (error) {
      toast.error(
        error instanceof AdminApiError ? error.message : "Erro ao salvar"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleEnvironmentToggle(useSandbox: boolean) {
    if (!form) return;
    const environment: MelhorEnvioEnvironment = useSandbox
      ? "sandbox"
      : "production";

    setSaving(true);
    try {
      // Salva o ambiente ativo e recarrega credenciais daquele ambiente
      const data = await updateMelhorEnvioSettings({ environment });
      setStatus(data);
      setForm({
        ...toForm(data),
        // Mantém campos comuns já editados se o usuário não salvou ainda
        redirectUri: form.redirectUri,
        userAgent: form.userAgent,
        originPostalCode: form.originPostalCode,
        defaultWidthCm: form.defaultWidthCm,
        defaultHeightCm: form.defaultHeightCm,
        defaultLengthCm: form.defaultLengthCm,
        defaultWeightKg: form.defaultWeightKg,
      });
      toast.success(
        useSandbox
          ? "Ambiente sandbox ativo — use o app de testes"
          : "Ambiente de produção ativo"
      );
    } catch (error) {
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Erro ao trocar ambiente"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const data = await disconnectMelhorEnvio();
      setStatus(data);
      setForm(toForm(data));
      setDisconnectOpen(false);
      toast.success("Conta Melhor Envio desconectada neste ambiente");
    } catch (error) {
      toast.error(
        error instanceof AdminApiError ? error.message : "Erro ao desconectar"
      );
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleConnect() {
    if (!form) return;

    setSaving(true);
    try {
      // Garante que Client ID/Secret e callback estão salvos antes do redirect OAuth
      await updateMelhorEnvioSettings({
        environment: form.environment,
        clientId: form.clientId.trim(),
        clientSecret: form.clientSecret.trim() || undefined,
        redirectUri: form.redirectUri.trim(),
        userAgent: form.userAgent.trim(),
        originPostalCode: form.originPostalCode,
        defaultWidthCm: Number(form.defaultWidthCm),
        defaultHeightCm: Number(form.defaultHeightCm),
        defaultLengthCm: Number(form.defaultLengthCm),
        defaultWeightKg: Number(form.defaultWeightKg),
        freeShippingEnabled: form.freeShippingEnabled,
        freeShippingThreshold: Number(form.freeShippingThreshold),
        senderName: form.senderName,
        senderEmail: form.senderEmail,
        senderPhone: form.senderPhone,
        senderDocumentType: form.senderDocumentType,
        senderDocument: form.senderDocument,
        senderStateRegister: form.senderStateRegister,
        senderAddress: form.senderAddress,
        senderNumber: form.senderNumber,
        senderComplement: form.senderComplement,
        senderDistrict: form.senderDistrict,
        senderCity: form.senderCity,
        senderStateAbbr: form.senderStateAbbr,
      });
      window.location.href = "/api/admin/melhor-envio/connect";
    } catch (error) {
      setSaving(false);
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Salve as configurações antes de conectar"
      );
    }
  }

  async function copyRedirectUri() {
    const value = form?.redirectUri || status?.suggestedRedirectUri || "";
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("URL de callback copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  const canConnect =
    Boolean(form?.clientId.trim()) &&
    Boolean(status?.hasClientSecret || form?.clientSecret.trim()) &&
    Boolean(form?.redirectUri.trim());

  return (
    <AdminLayout title="Integrações">
      <div className="mx-auto mb-6 max-w-3xl">
        <MercadoPagoIntegrationCard />
      </div>
      {loading || !form || !status ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-8 text-[var(--admin-accent)]" />
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          <Card className="space-y-4 border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[var(--admin-surface-hover)] p-2.5">
                  <Truck className="size-5 text-[var(--admin-accent)]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--admin-text)]">
                    Melhor Envio
                  </h2>
                  <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                    Autenticação OAuth2 e cotação de fretes. Produção e sandbox
                    usam apps e contas separados.
                  </p>
                </div>
              </div>

              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  status.connected
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {status.connected ? (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Conectado
                  </>
                ) : (
                  "Não conectado"
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--admin-text)]">
                  {form.environment === "sandbox"
                    ? "Sandbox (testes)"
                    : "Produção"}
                </p>
                <p className="text-xs text-[var(--admin-text-muted)]">
                  {form.environment === "sandbox"
                    ? "sandbox.melhorenvio.com.br — sem envios reais"
                    : "melhorenvio.com.br — envios reais"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--admin-text-muted)]">
                  Sandbox
                </span>
                <Switch
                  checked={form.environment === "sandbox"}
                  disabled={saving}
                  onCheckedChange={checked =>
                    void handleEnvironmentToggle(checked)
                  }
                />
              </div>
            </div>

            {status.connected && (
              <p className="text-xs text-[var(--admin-text-muted)]">
                Token válido até {formatExpiresAt(status.tokenExpiresAt)}{" "}
                (renovação automática).
              </p>
            )}
          </Card>

          <form onSubmit={handleSave} className="space-y-6">
            <Card className="space-y-4 border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Aplicativo (
                {form.environment === "sandbox" ? "sandbox" : "produção"})
              </h3>
              <p className="text-sm text-[var(--admin-text-muted)]">
                Crie o app em Integrações → Área Dev. no painel do Melhor Envio
                {form.environment === "sandbox" ? " Sandbox" : ""} e cole Client
                ID e Secret abaixo. A URL de callback deve ser idêntica à
                cadastrada no app.
              </p>

              <div className="space-y-2">
                <Label htmlFor="redirectUri">
                  URL de callback (redirect_uri)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="redirectUri"
                    value={form.redirectUri}
                    onChange={e =>
                      setForm({ ...form, redirectUri: e.target.value })
                    }
                    placeholder={status.suggestedRedirectUri}
                    className="font-mono text-xs sm:text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyRedirectUri}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-[var(--admin-text-muted)]">
                  Sugerida:{" "}
                  <button
                    type="button"
                    className="font-mono text-[var(--admin-accent)] underline-offset-2 hover:underline"
                    onClick={() =>
                      setForm({
                        ...form,
                        redirectUri: status.suggestedRedirectUri,
                      })
                    }
                  >
                    {status.suggestedRedirectUri}
                  </button>
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    value={form.clientId}
                    onChange={e =>
                      setForm({ ...form, clientId: e.target.value })
                    }
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">
                    Client Secret
                    {status.hasClientSecret
                      ? " (deixe em branco para manter)"
                      : ""}
                  </Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={form.clientSecret}
                    onChange={e =>
                      setForm({ ...form, clientSecret: e.target.value })
                    }
                    placeholder={status.hasClientSecret ? "••••••••" : ""}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userAgent">User-Agent</Label>
                <Input
                  id="userAgent"
                  value={form.userAgent}
                  onChange={e =>
                    setForm({ ...form, userAgent: e.target.value })
                  }
                  placeholder="Nativa Store (contato@nativa.art.br)"
                />
                <p className="text-xs text-[var(--admin-text-muted)]">
                  Obrigatório pela API: nome da aplicação + e-mail de contato.
                </p>
              </div>
            </Card>

            <Card className="space-y-4 border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--admin-text-muted)]">
                  Remetente da etiqueta
                </h3>
                <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                  Dados usados na declaração de conteúdo após o pagamento.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="senderName">Nome ou razão social</Label>
                  <Input id="senderName" value={form.senderName} onChange={e => setForm({ ...form, senderName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">E-mail</Label>
                  <Input id="senderEmail" type="email" value={form.senderEmail} onChange={e => setForm({ ...form, senderEmail: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderPhone">Telefone</Label>
                  <Input id="senderPhone" value={form.senderPhone} onChange={e => setForm({ ...form, senderPhone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderDocumentType">Tipo de documento</Label>
                  <select
                    id="senderDocumentType"
                    value={form.senderDocumentType}
                    onChange={e => setForm({ ...form, senderDocumentType: e.target.value as "cpf" | "cnpj" })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderDocument">{form.senderDocumentType === "cnpj" ? "CNPJ" : "CPF"}</Label>
                  <Input id="senderDocument" value={form.senderDocument} onChange={e => setForm({ ...form, senderDocument: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderStateRegister">Inscrição estadual</Label>
                  <Input id="senderStateRegister" value={form.senderStateRegister} onChange={e => setForm({ ...form, senderStateRegister: e.target.value })} placeholder="ISENTO" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="senderAddress">Logradouro</Label>
                  <Input id="senderAddress" value={form.senderAddress} onChange={e => setForm({ ...form, senderAddress: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderNumber">Número</Label>
                  <Input id="senderNumber" value={form.senderNumber} onChange={e => setForm({ ...form, senderNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderComplement">Complemento</Label>
                  <Input id="senderComplement" value={form.senderComplement} onChange={e => setForm({ ...form, senderComplement: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderDistrict">Bairro</Label>
                  <Input id="senderDistrict" value={form.senderDistrict} onChange={e => setForm({ ...form, senderDistrict: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderCity">Cidade</Label>
                  <Input id="senderCity" value={form.senderCity} onChange={e => setForm({ ...form, senderCity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderStateAbbr">UF</Label>
                  <Input id="senderStateAbbr" maxLength={2} value={form.senderStateAbbr} onChange={e => setForm({ ...form, senderStateAbbr: e.target.value.toUpperCase() })} />
                </div>
              </div>
            </Card>

            <Card className="space-y-4 border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Origem e pacote padrão
              </h3>
              <p className="text-sm text-[var(--admin-text-muted)]">
                Usados na cotação quando o produto ainda não tem peso/dimensões
                cadastrados.
              </p>

              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="freeShippingEnabled">Frete grátis</Label>
                    <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                      Zera a opção mais barata quando o pedido atingir o valor mínimo.
                    </p>
                  </div>
                  <Switch
                    id="freeShippingEnabled"
                    checked={form.freeShippingEnabled}
                    onCheckedChange={checked =>
                      setForm({ ...form, freeShippingEnabled: checked })
                    }
                  />
                </div>
                {form.freeShippingEnabled && (
                  <div className="mt-4 max-w-xs space-y-2">
                    <Label htmlFor="freeShippingThreshold">
                      Valor mínimo do pedido (R$)
                    </Label>
                    <Input
                      id="freeShippingThreshold"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={form.freeShippingThreshold}
                      onChange={e =>
                        setForm({
                          ...form,
                          freeShippingThreshold: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="originCep">CEP de origem da loja</Label>
                <Input
                  id="originCep"
                  value={form.originPostalCode}
                  onChange={e =>
                    setForm({
                      ...form,
                      originPostalCode: formatCep(e.target.value),
                    })
                  }
                  placeholder="00000-000"
                  inputMode="numeric"
                  maxLength={9}
                  className="max-w-[10rem]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="w">Largura (cm)</Label>
                  <Input
                    id="w"
                    type="number"
                    min={0.1}
                    step="0.1"
                    value={form.defaultWidthCm}
                    onChange={e =>
                      setForm({ ...form, defaultWidthCm: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="h">Altura (cm)</Label>
                  <Input
                    id="h"
                    type="number"
                    min={0.1}
                    step="0.1"
                    value={form.defaultHeightCm}
                    onChange={e =>
                      setForm({ ...form, defaultHeightCm: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="l">Comprimento (cm)</Label>
                  <Input
                    id="l"
                    type="number"
                    min={0.1}
                    step="0.1"
                    value={form.defaultLengthCm}
                    onChange={e =>
                      setForm({ ...form, defaultLengthCm: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kg">Peso (kg)</Label>
                  <Input
                    id="kg"
                    type="number"
                    min={0.001}
                    step="0.001"
                    value={form.defaultWeightKg}
                    onChange={e =>
                      setForm({ ...form, defaultWeightKg: e.target.value })
                    }
                  />
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
                  <Spinner className="size-4" />
                ) : (
                  <Save className="size-4" />
                )}
                Salvar
              </Button>

              <Button
                type="button"
                variant="default"
                disabled={!canConnect || saving}
                className="gap-2 bg-[#2D6A4F] hover:bg-[#245a42]"
                onClick={handleConnect}
              >
                <ExternalLink className="size-4" />
                {status.connected ? "Reconectar" : "Conectar com Melhor Envio"}
              </Button>

              {status.connected && (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 text-red-600 hover:text-red-700"
                  onClick={() => setDisconnectOpen(true)}
                >
                  <Link2Off className="size-4" />
                  Desconectar
                </Button>
              )}
            </div>
          </form>

          <Card className="border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 text-sm text-[var(--admin-text-muted)] shadow-sm">
            <p className="font-semibold text-[var(--admin-text)]">
              Como configurar
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>
                Cadastre um app em{" "}
                {form.environment === "sandbox" ? (
                  <a
                    href="https://sandbox.melhorenvio.com.br"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--admin-accent)] underline-offset-2 hover:underline"
                  >
                    sandbox.melhorenvio.com.br
                  </a>
                ) : (
                  <a
                    href="https://melhorenvio.com.br"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--admin-accent)] underline-offset-2 hover:underline"
                  >
                    melhorenvio.com.br
                  </a>
                )}{" "}
                → Integrações → Área Dev.
              </li>
              <li>
                Cole a URL de callback exatamente como acima no campo do app.
              </li>
              <li>Salve Client ID e Secret aqui e clique em Conectar.</li>
              <li>
                Autorize todas as permissões (já solicitamos o escopo completo
                para etiquetas e próximos módulos).
              </li>
            </ol>
            <p className="mt-3 text-xs">
              Produção configurada:{" "}
              {status.productionConfigured ? "sim" : "não"}
              {status.productionConnected ? " (conectada)" : ""} · Sandbox:{" "}
              {status.sandboxConfigured ? "sim" : "não"}
              {status.sandboxConnected ? " (conectada)" : ""}
            </p>
          </Card>
        </div>
      )}

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Melhor Envio?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove os tokens do ambiente{" "}
              <strong>
                {form?.environment === "sandbox" ? "sandbox" : "produção"}
              </strong>
              . As credenciais do app (Client ID/Secret) permanecem salvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={disconnecting}
              className="bg-red-600 hover:bg-red-700"
              onClick={e => {
                e.preventDefault();
                void handleDisconnect();
              }}
            >
              {disconnecting ? "Desconectando…" : "Desconectar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
