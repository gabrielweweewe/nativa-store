import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  AdminApiError,
  fetchMercadoPagoStatus,
  testMercadoPagoCredentials,
  updateMercadoPagoSettings,
} from "@/lib/adminApi";
import type {
  MercadoPagoAdminStatus,
  MercadoPagoEnvironment,
  MercadoPagoSettingsInput,
} from "@shared/types/mercadoPago";
import { CheckCircle2, Copy, CreditCard, Save, TestTube2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type FormState = MercadoPagoSettingsInput & {
  accessToken: string;
  webhookSecret: string;
};

function toForm(status: MercadoPagoAdminStatus): FormState {
  return {
    environment: status.environment,
    enabled: status.enabled,
    publicKey: status.publicKey,
    accessToken: "",
    webhookSecret: "",
    pixEnabled: status.pixEnabled,
    boletoEnabled: status.boletoEnabled,
    creditCardEnabled: status.creditCardEnabled,
    maxInstallments: status.maxInstallments,
    boletoExpirationDays: status.boletoExpirationDays,
  };
}

export default function MercadoPagoIntegrationCard() {
  const [status, setStatus] = useState<MercadoPagoAdminStatus | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function load(environment: MercadoPagoEnvironment) {
    setLoading(true);
    try {
      const data = await fetchMercadoPagoStatus(environment);
      setStatus(data);
      setForm(toForm(data));
    } catch (error) {
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Erro ao carregar Mercado Pago"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("test");
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const data = await updateMercadoPagoSettings({
        ...form,
        accessToken: form.accessToken.trim() || undefined,
        webhookSecret: form.webhookSecret.trim() || undefined,
      });
      setStatus(data);
      setForm(toForm(data));
      toast.success("Configurações do Mercado Pago salvas");
    } catch (error) {
      toast.error(
        error instanceof AdminApiError ? error.message : "Erro ao salvar"
      );
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    if (!form) return;
    setTesting(true);
    try {
      await testMercadoPagoCredentials(form.environment);
      toast.success("Access Token validado com sucesso");
    } catch (error) {
      toast.error(
        error instanceof AdminApiError ? error.message : "Credenciais inválidas"
      );
    } finally {
      setTesting(false);
    }
  }

  if (loading || !form || !status) {
    return (
      <Card className="flex justify-center border-[var(--admin-border)] p-8">
        <Spinner className="size-6 text-[var(--admin-accent)]" />
      </Card>
    );
  }

  return (
    <form onSubmit={save}>
      <Card className="space-y-5 border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-50 p-2.5">
              <CreditCard className="size-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--admin-text)]">
                Mercado Pago
              </h2>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                Orders API: cartão, Pix e boleto no checkout transparente.
              </p>
            </div>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status.enabled && status.configured
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {status.enabled && status.configured ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3.5" /> Ativo
              </span>
            ) : (
              "Inativo"
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] p-4">
          <div>
            <p className="font-semibold text-[var(--admin-text)]">
              {form.environment === "test"
                ? "Credenciais de teste"
                : "Credenciais de produção"}
            </p>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Ative produção somente depois de concluir todos os testes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Produção</span>
            <Switch
              checked={form.environment === "production"}
              onCheckedChange={checked =>
                void load(checked ? "production" : "test")
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] p-4">
          <div>
            <Label>Habilitar este ambiente no checkout</Label>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Ao ativar, o outro ambiente é desativado automaticamente.
            </p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={enabled => setForm({ ...form, enabled })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="mp-public-key">Public Key</Label>
            <Input
              id="mp-public-key"
              value={form.publicKey}
              onChange={event =>
                setForm({ ...form, publicKey: event.target.value })
              }
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mp-token">
              Access Token
              {status.hasAccessToken ? " (vazio mantém o atual)" : ""}
            </Label>
            <Input
              id="mp-token"
              type="password"
              value={form.accessToken}
              onChange={event =>
                setForm({ ...form, accessToken: event.target.value })
              }
              placeholder={status.hasAccessToken ? "••••••••" : ""}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mp-webhook-secret">
              Assinatura secreta do webhook
              {status.hasWebhookSecret ? " (vazio mantém)" : ""}
            </Label>
            <Input
              id="mp-webhook-secret"
              type="password"
              value={form.webhookSecret}
              onChange={event =>
                setForm({ ...form, webhookSecret: event.target.value })
              }
              placeholder={status.hasWebhookSecret ? "••••••••" : ""}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>URL do webhook (tópico Orders)</Label>
          <div className="flex gap-2">
            <Input
              value={status.webhookUrl}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                void navigator.clipboard.writeText(status.webhookUrl);
                toast.success("URL copiada");
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Pix", "pixEnabled"],
            ["Cartão", "creditCardEnabled"],
            ["Boleto", "boletoEnabled"],
          ].map(([label, key]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] p-3 text-sm font-semibold"
            >
              {label}
              <Switch
                checked={form[key as keyof FormState] as boolean}
                onCheckedChange={checked =>
                  setForm({ ...form, [key]: checked })
                }
              />
            </label>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mp-installments">Máximo de parcelas</Label>
            <Input
              id="mp-installments"
              type="number"
              min={1}
              max={12}
              value={form.maxInstallments}
              onChange={event =>
                setForm({
                  ...form,
                  maxInstallments: Number(event.target.value),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mp-boleto-days">Vencimento do boleto (dias)</Label>
            <Input
              id="mp-boleto-days"
              type="number"
              min={1}
              max={30}
              value={form.boletoExpirationDays}
              onChange={event =>
                setForm({
                  ...form,
                  boletoExpirationDays: Number(event.target.value),
                })
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <Spinner className="size-4" />
            ) : (
              <Save className="size-4" />
            )}{" "}
            Salvar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={testing}
            onClick={() => void test()}
            className="gap-2"
          >
            {testing ? (
              <Spinner className="size-4" />
            ) : (
              <TestTube2 className="size-4" />
            )}
            Testar conexão
          </Button>
        </div>

        <p className="text-xs text-[var(--admin-text-muted)]">
          Cadastre a URL acima em Suas integrações → Webhooks → Orders. Segredos
          são criptografados antes de serem armazenados e nunca enviados ao
          checkout.
        </p>
      </Card>
    </form>
  );
}
