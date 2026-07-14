import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  AdminApiError,
  configureBrevoWebhook,
  fetchBrevoLists,
  fetchBrevoSenders,
  fetchBrevoStatus,
  fetchBrevoTemplates,
  testBrevoConnection,
  updateBrevoSettings,
  type BrevoList,
  type BrevoSender,
  type BrevoStatus,
  type BrevoTemplate,
} from "@/lib/adminApi";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  Save,
  TestTube2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function BrevoIntegrationCard() {
  const [status, setStatus] = useState<BrevoStatus | null>(null);
  const [senders, setSenders] = useState<BrevoSender[]>([]);
  const [lists, setLists] = useState<BrevoList[]>([]);
  const [templates, setTemplates] = useState<BrevoTemplate[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [senderId, setSenderId] = useState("");
  const [listId, setListId] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [templateIds, setTemplateIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchBrevoStatus();
      setStatus(data);
      setEnabled(data.enabled);
      setListId(data.defaultListId ? String(data.defaultListId) : "");
      setReplyTo(data.replyTo ?? "");
      setTemplateIds({
        templateOrderReceived: data.templateOrderReceived
          ? String(data.templateOrderReceived)
          : "",
        templatePaymentApproved: data.templatePaymentApproved
          ? String(data.templatePaymentApproved)
          : "",
        templatePaymentFailed: data.templatePaymentFailed
          ? String(data.templatePaymentFailed)
          : "",
        templatePaymentRefunded: data.templatePaymentRefunded
          ? String(data.templatePaymentRefunded)
          : "",
        templateOrderProcessing: data.templateOrderProcessing
          ? String(data.templateOrderProcessing)
          : "",
        templateOrderShipped: data.templateOrderShipped
          ? String(data.templateOrderShipped)
          : "",
        templateOrderDelivered: data.templateOrderDelivered
          ? String(data.templateOrderDelivered)
          : "",
      });
      const [senderData, listData, templateData] = data.hasApiKey
        ? await Promise.all([
            fetchBrevoSenders().catch(() => []),
            fetchBrevoLists().catch(() => []),
            fetchBrevoTemplates().catch(() => []),
          ])
        : [[], [], []];
      setSenders(senderData);
      setLists(listData);
      setTemplates(templateData);
      const selectedSender =
        senderData.find(sender => sender.id === data.defaultSenderId) ??
        senderData.find(
          sender =>
            sender.email.toLowerCase() ===
            (data.defaultSenderEmail ?? "").toLowerCase()
        );
      setSenderId(selectedSender ? String(selectedSender.id) : "");
    } catch (error) {
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Não foi possível carregar a integração"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!status) return;
    setSaving(true);
    try {
      const selectedSender = senders.find(sender => String(sender.id) === senderId);
      const data = await updateBrevoSettings({
        enabled,
        apiKey: apiKey.trim() || undefined,
        webhookToken: webhookToken.trim() || undefined,
        defaultSenderId: selectedSender?.id ?? status.defaultSenderId ?? null,
        defaultSenderEmail: selectedSender?.email ?? status.defaultSenderEmail ?? "",
        defaultSenderName: selectedSender?.name ?? status.defaultSenderName ?? "",
        replyTo: replyTo.trim(),
        defaultListId: listId ? Number(listId) : null,
        ...Object.fromEntries(
          Object.entries(templateIds).map(([key, value]) => [
            key,
            value ? Number(value) : null,
          ])
        ),
      });
      setStatus(data);
      setApiKey("");
      setWebhookToken("");
      toast.success("Configurações da Brevo salvas");
      if (data.hasApiKey) {
        const [senderData, listData, templateData] = await Promise.all([
          fetchBrevoSenders().catch(() => []),
          fetchBrevoLists().catch(() => []),
          fetchBrevoTemplates().catch(() => []),
        ]);
        setSenders(senderData);
        setLists(listData);
        setTemplates(templateData);
      }
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      await testBrevoConnection();
      toast.success("Conexão com a Brevo validada");
      await load();
    } catch (error) {
      toast.error(
        error instanceof AdminApiError ? error.message : "Credenciais inválidas"
      );
    } finally {
      setTesting(false);
    }
  }

  async function configureWebhook() {
    setConfiguringWebhook(true);
    try {
      await configureBrevoWebhook();
      toast.success("Webhooks transacional e marketing configurados");
      await load();
    } catch (error) {
      toast.error(
        error instanceof AdminApiError ? error.message : "Erro ao configurar webhook"
      );
    } finally {
      setConfiguringWebhook(false);
    }
  }

  if (loading || !status) {
    return (
      <Card className="flex justify-center border-[var(--admin-border)] p-8">
        <Spinner className="size-6 text-[var(--admin-accent)]" />
      </Card>
    );
  }

  const active = status.enabled && status.configured;

  return (
    <form onSubmit={save}>
      <Card className="space-y-5 border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <Mail className="size-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--admin-text)]">Brevo</h2>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                Newsletters, campanhas e contatos sincronizados.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {active && <CheckCircle2 className="size-3.5" />}
            {active ? "Ativa" : status.configured ? "Inativa" : "Não configurada"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--admin-border)] p-4">
          <div>
            <Label>Habilitar integração</Label>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Permite inscrições e envios pelo painel.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brevo-api-key">
            API key {status.hasApiKey ? "(vazio mantém a atual)" : ""}
          </Label>
          <Input
            id="brevo-api-key"
            type="password"
            value={apiKey}
            onChange={event => setApiKey(event.target.value)}
            placeholder={status.hasApiKey ? "••••••••••••" : "xkeysib-..."}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brevo-webhook-token">
            Token do webhook {status.hasWebhookToken ? "(vazio mantém o atual)" : ""}
          </Label>
          <Input
            id="brevo-webhook-token"
            type="password"
            value={webhookToken}
            onChange={event => setWebhookToken(event.target.value)}
            placeholder={status.hasWebhookToken ? "••••••••••••" : "Mínimo de 32 caracteres"}
            autoComplete="new-password"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Remetente padrão</Label>
            <Select value={senderId} onValueChange={setSenderId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um remetente" />
              </SelectTrigger>
              <SelectContent>
                {senders.map(sender => (
                  <SelectItem key={sender.id} value={String(sender.id)}>
                    {sender.name} — {sender.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Lista padrão da newsletter</Label>
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma lista" />
              </SelectTrigger>
              <SelectContent>
                {lists.map(list => (
                  <SelectItem key={list.id} value={String(list.id)}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brevo-reply-to">E-mail para respostas</Label>
          <Input
            id="brevo-reply-to"
            type="email"
            value={replyTo}
            onChange={event => setReplyTo(event.target.value)}
            placeholder="contato@seudominio.com.br"
          />
        </div>

        <div className="space-y-3">
          <div>
            <Label>Templates dos pedidos</Label>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Crie e ative os templates transacionais no Brevo antes de selecioná-los.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["templateOrderReceived", "Pedido recebido"],
              ["templatePaymentApproved", "Pagamento aprovado"],
              ["templatePaymentFailed", "Pagamento recusado/cancelado"],
              ["templatePaymentRefunded", "Pagamento reembolsado"],
              ["templateOrderProcessing", "Em preparação"],
              ["templateOrderShipped", "Pedido enviado"],
              ["templateOrderDelivered", "Pedido entregue"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Select
                  value={templateIds[key] || undefined}
                  onValueChange={value =>
                    setTemplateIds(current => ({ ...current, [key]: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Não configurado" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        #{template.id} — {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>URL do webhook</Label>
          <div className="flex gap-2">
            <Input value={status.webhookUrl} readOnly className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copiar URL do webhook"
              onClick={() => {
                void navigator.clipboard.writeText(status.webhookUrl);
                toast.success("URL copiada");
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-[var(--admin-text-muted)]">
            O botão abaixo registra os eventos de entrega, abertura, clique,
            bounce e descadastro com autenticação Bearer.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Spinner className="size-4" /> : <Save className="size-4" />}
            Salvar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={testing || !status.hasApiKey}
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
          <Button
            type="button"
            variant="outline"
            disabled={
              configuringWebhook ||
              !status.hasApiKey ||
              !(status.hasWebhookToken || status.webhookConfigured)
            }
            onClick={() => void configureWebhook()}
          >
            {configuringWebhook && <Spinner className="size-4" />}
            Configurar webhook
          </Button>
          {status.configured && (
            <Button variant="outline" asChild className="gap-2">
              <Link href="/admin/email-marketing/campanhas">
                Abrir Email Marketing <ExternalLink className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </Card>
    </form>
  );
}
