import AdminLayout from "@/components/admin/AdminLayout";
import EmailMarketingNav from "@/components/admin/EmailMarketingNav";
import AdminStatGrid from "@/components/admin/AdminStatGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  AdminApiError,
  fetchBrevoCampaignMetrics,
  fetchBrevoCampaigns,
  scheduleBrevoCampaign,
  sendBrevoCampaign,
  type BrevoCampaign,
  type BrevoCampaignMetrics,
  type BrevoCampaignStatus,
} from "@/lib/adminApi";
import {
  BarChart3,
  CalendarClock,
  Eye,
  MailCheck,
  MousePointerClick,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const statusLabels: Record<BrevoCampaignStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  sent: "Enviada",
  paused: "Pausada",
  failed: "Falhou",
};

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export default function AdminEmailCampaigns() {
  const [campaigns, setCampaigns] = useState<BrevoCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<BrevoCampaignMetrics | null>(null);
  const [metricsName, setMetricsName] = useState("");
  const [scheduleTarget, setScheduleTarget] = useState<BrevoCampaign | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");

  async function load() {
    setLoading(true);
    try {
      setCampaigns(await fetchBrevoCampaigns());
    } catch (error) {
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Não foi possível carregar as campanhas"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(
    () => ({
      total: campaigns.length,
      sent: campaigns.filter(campaign => campaign.status === "sent").length,
      scheduled: campaigns.filter(campaign => campaign.status === "scheduled")
        .length,
      drafts: campaigns.filter(campaign => campaign.status === "draft").length,
    }),
    [campaigns]
  );

  async function sendNow(campaign: BrevoCampaign) {
    if (!window.confirm(`Enviar "${campaign.name}" agora?`)) return;
    const id = String(campaign.id);
    setBusyId(id);
    try {
      await sendBrevoCampaign(id);
      setCampaigns(current =>
        current.map(item =>
          String(item.id) === id
            ? { ...item, status: "sent", sentAt: new Date().toISOString() }
            : item
        )
      );
      toast.success("Campanha enviada");
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Erro no envio");
    } finally {
      setBusyId(null);
    }
  }

  async function schedule() {
    if (!scheduleTarget || !scheduledAt) return;
    const id = String(scheduleTarget.id);
    setBusyId(id);
    try {
      const scheduledIso = new Date(scheduledAt).toISOString();
      await scheduleBrevoCampaign(id, scheduledIso);
      setCampaigns(current =>
        current.map(item =>
          String(item.id) === id
            ? { ...item, status: "scheduled", scheduledAt: scheduledIso }
            : item
        )
      );
      setScheduleTarget(null);
      setScheduledAt("");
      toast.success("Campanha agendada");
    } catch (error) {
      toast.error(
        error instanceof AdminApiError ? error.message : "Erro ao agendar"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function openMetrics(campaign: BrevoCampaign) {
    setMetricsName(campaign.name);
    setMetrics(null);
    setBusyId(String(campaign.id));
    try {
      setMetrics(await fetchBrevoCampaignMetrics(String(campaign.id)));
    } catch (error) {
      setMetricsName("");
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Não foi possível carregar as métricas"
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminLayout
      title="Email Marketing"
      actions={
        <Button asChild size="sm" className="gap-2">
          <Link href="/admin/email-marketing/campanhas/nova">
            <Plus className="size-4" /> Nova campanha
          </Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-6xl">
        <EmailMarketingNav />
        <AdminStatGrid
          items={[
            { label: "Campanhas", value: String(stats.total), icon: MailCheck, accent: "green" },
            { label: "Enviadas", value: String(stats.sent), icon: Send, accent: "green" },
            { label: "Agendadas", value: String(stats.scheduled), icon: CalendarClock },
            { label: "Rascunhos", value: String(stats.drafts), icon: BarChart3 },
          ]}
        />

        <div className="mt-4 flex justify-end sm:hidden">
          <Button asChild className="w-full gap-2">
            <Link href="/admin/email-marketing/campanhas/nova">
              <Plus className="size-4" /> Nova campanha
            </Link>
          </Button>
        </div>

        <Card className="admin-card mt-4 overflow-hidden border-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-[var(--admin-text-muted)]">
              <Spinner className="size-5" /> Carregando campanhas...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-10 text-center">
              <MailCheck className="mx-auto size-9 text-[var(--admin-text-muted)]" />
              <h2 className="mt-3 font-bold text-[var(--admin-text)]">
                Nenhuma campanha criada
              </h2>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                Crie seu primeiro e-mail para uma lista de contatos.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--admin-border)]">
              {campaigns.map(campaign => {
                const id = String(campaign.id);
                const isBusy = busyId === id;
                return (
                  <article
                    key={id}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-bold text-[var(--admin-text)]">
                          {campaign.name}
                        </h2>
                        <Badge variant="outline">{statusLabels[campaign.status]}</Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-[var(--admin-text-muted)]">
                        {campaign.subject}
                      </p>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                        {campaign.scheduledAt
                          ? `Agendada para ${new Date(campaign.scheduledAt).toLocaleString("pt-BR")}`
                          : campaign.sentAt
                            ? `Enviada em ${new Date(campaign.sentAt).toLocaleString("pt-BR")}`
                            : "Ainda não enviada"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:shrink-0">
                      {campaign.status === "sent" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={isBusy}
                          onClick={() => void openMetrics(campaign)}
                        >
                          {isBusy ? <Spinner className="size-4" /> : <BarChart3 className="size-4" />}
                          Métricas
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/email-marketing/campanhas/${id}/editar`}>
                              Editar
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => setScheduleTarget(campaign)}
                            aria-label={`Agendar ${campaign.name}`}
                          >
                            <CalendarClock className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="gap-2"
                            disabled={isBusy}
                            onClick={() => void sendNow(campaign)}
                          >
                            {isBusy ? <Spinner className="size-4" /> : <Send className="size-4" />}
                            Enviar
                          </Button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={Boolean(scheduleTarget)} onOpenChange={open => !open && setScheduleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar campanha</DialogTitle>
            <DialogDescription>
              Escolha uma data e horário futuros para o envio.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="datetime-local"
            value={scheduledAt}
            min={new Date().toISOString().slice(0, 16)}
            onChange={event => setScheduledAt(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleTarget(null)}>
              Cancelar
            </Button>
            <Button disabled={!scheduledAt || Boolean(busyId)} onClick={() => void schedule()}>
              {busyId && <Spinner className="size-4" />} Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(metricsName)} onOpenChange={open => !open && setMetricsName("")}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Métricas — {metricsName}</DialogTitle>
            <DialogDescription>Resultados consolidados pela Brevo.</DialogDescription>
          </DialogHeader>
          {!metrics ? (
            <div className="flex justify-center p-8"><Spinner className="size-6" /></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Entregues", metrics.delivered, Users],
                ["Aberturas", metrics.opened, Eye],
                ["Cliques", metrics.clicked, MousePointerClick],
                ["Taxa de abertura", percent(metrics.openRate), Eye],
                ["Taxa de clique", percent(metrics.clickRate), MousePointerClick],
                ["Descadastros", metrics.unsubscribed, Users],
              ].map(([label, value, Icon]) => {
                const MetricIcon = Icon as typeof Users;
                return (
                  <div key={String(label)} className="rounded-xl border border-[var(--admin-border)] p-4">
                    <MetricIcon className="size-4 text-emerald-600" />
                    <p className="mt-3 text-xl font-bold text-[var(--admin-text)]">{String(value)}</p>
                    <p className="text-xs text-[var(--admin-text-muted)]">{String(label)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
