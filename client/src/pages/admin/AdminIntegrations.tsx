import AdminLayout from "@/components/admin/AdminLayout";
import BrevoIntegrationCard from "@/components/admin/BrevoIntegrationCard";
import MelhorEnvioIntegrationCard from "@/components/admin/MelhorEnvioIntegrationCard";
import MercadoPagoIntegrationCard from "@/components/admin/MercadoPagoIntegrationCard";
import MetaCatalogIntegrationCard from "@/components/admin/MetaCatalogIntegrationCard";
import {
  getIntegrationById,
  getIntegrationsByCategory,
  INTEGRATION_CATEGORIES,
  type IntegrationDefinition,
  type IntegrationId,
} from "@/components/admin/integrations/integrationCatalog";
import { Button } from "@/components/ui/button";
import {
  AdminApiError,
  fetchBrevoStatus,
  fetchMelhorEnvioStatus,
  fetchMercadoPagoStatus,
  fetchMetaCatalogStatus,
} from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Plug,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type LiveStatusMap = Partial<
  Record<IntegrationId, "active" | "inactive" | "unknown">
>;

function readSelectedFromUrl(): IntegrationId | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get("me_connected") || params.get("me_error")) {
    return "melhor-envio";
  }
  const integration = params.get("i");
  const found = getIntegrationById(integration);
  if (found?.availability === "available") {
    return found.id;
  }
  return null;
}

function setUrlIntegration(id: IntegrationId | null) {
  const url = new URL(window.location.href);
  if (id) {
    url.searchParams.set("i", id);
  } else {
    url.searchParams.delete("i");
  }
  window.history.replaceState({}, "", url.pathname + url.search);
}

function StatusBadge({
  integration,
  liveStatus,
}: {
  integration: IntegrationDefinition;
  liveStatus?: "active" | "inactive" | "unknown";
}) {
  if (integration.availability === "coming_soon") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
        <Clock3 className="size-3" />
        Em breve
      </span>
    );
  }

  if (liveStatus === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="size-3" />
        Ativo
      </span>
    );
  }

  if (liveStatus === "inactive") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
        Inativo
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--admin-accent)]">
      Disponível
    </span>
  );
}

function IntegrationTile({
  integration,
  liveStatus,
  onSelect,
}: {
  integration: IntegrationDefinition;
  liveStatus?: "active" | "inactive" | "unknown";
  onSelect: (id: IntegrationId) => void;
}) {
  const Icon = integration.icon;
  const isAvailable = integration.availability === "available";

  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={() => {
        if (isAvailable) onSelect(integration.id);
      }}
      className={cn(
        "group relative flex h-full flex-col rounded-[var(--admin-radius-lg)] border bg-[var(--admin-surface)] p-4 text-left shadow-[var(--admin-shadow)] transition-all duration-200",
        isAvailable
          ? "border-[var(--admin-border)] hover:-translate-y-0.5 hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-md)]"
          : "cursor-not-allowed border-dashed border-[var(--admin-border)] opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "rounded-xl p-2.5 transition-transform duration-200",
            integration.iconBg,
            isAvailable && "group-hover:scale-105"
          )}
        >
          <Icon className={cn("size-5", integration.iconColor)} />
        </div>
        <StatusBadge integration={integration} liveStatus={liveStatus} />
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <h3 className="text-base font-bold tracking-tight text-[var(--admin-text)]">
          {integration.name}
        </h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--admin-text-muted)]">
          {integration.description}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--admin-border)] pt-3">
        <span
          className={cn(
            "text-xs font-semibold",
            isAvailable
              ? "text-[var(--admin-accent)]"
              : "text-[var(--admin-text-muted)]"
          )}
        >
          {isAvailable ? "Configurar" : "Em desenvolvimento"}
        </span>
        {isAvailable && (
          <ChevronRight className="size-4 text-[var(--admin-text-muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--admin-accent)]" />
        )}
      </div>
    </button>
  );
}

export default function AdminIntegrations() {
  const [selectedId, setSelectedId] = useState<IntegrationId | null>(() =>
    readSelectedFromUrl()
  );
  const [liveStatus, setLiveStatus] = useState<LiveStatusMap>({});

  const selected = useMemo(
    () => getIntegrationById(selectedId) ?? null,
    [selectedId]
  );

  useEffect(() => {
    if (selectedId) setUrlIntegration(selectedId);
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;

    async function loadStatuses() {
      try {
        const [mpTest, mpProd, me, brevo, meta] = await Promise.all([
          fetchMercadoPagoStatus("test").catch(() => null),
          fetchMercadoPagoStatus("production").catch(() => null),
          fetchMelhorEnvioStatus().catch(() => null),
          fetchBrevoStatus().catch(() => null),
          fetchMetaCatalogStatus().catch(() => null),
        ]);

        if (cancelled) return;

        const next: LiveStatusMap = {};
        const mpActive =
          (mpTest?.enabled && mpTest.configured) ||
          (mpProd?.enabled && mpProd.configured);

        if (mpTest || mpProd) {
          next["mercado-pago"] = mpActive ? "active" : "inactive";
        } else {
          next["mercado-pago"] = "unknown";
        }

        if (me) {
          next["melhor-envio"] = me.connected ? "active" : "inactive";
        } else {
          next["melhor-envio"] = "unknown";
        }

        if (brevo) {
          next.brevo =
            brevo.enabled && brevo.configured ? "active" : "inactive";
        } else {
          next.brevo = "unknown";
        }

        if (meta) {
          next["meta-catalog"] = meta.enabled ? "active" : "inactive";
        } else {
          next["meta-catalog"] = "unknown";
        }

        setLiveStatus(next);
      } catch (error) {
        if (!(error instanceof AdminApiError)) return;
      }
    }

    void loadStatuses();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function openIntegration(id: IntegrationId) {
    setSelectedId(id);
    setUrlIntegration(id);
  }

  function closeIntegration() {
    setSelectedId(null);
    setUrlIntegration(null);
  }

  const availableCount = useMemo(
    () =>
      INTEGRATION_CATEGORIES.reduce(
        (total, category) =>
          total +
          getIntegrationsByCategory(category.id).filter(
            item => item.availability === "available"
          ).length,
        0
      ),
    []
  );

  return (
    <AdminLayout title="Integrações">
      <div className="mx-auto max-w-5xl">
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={closeIntegration}
              >
                <ArrowLeft className="size-4" />
                Todas as integrações
              </Button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                  {
                    INTEGRATION_CATEGORIES.find(
                      category => category.id === selected.categoryId
                    )?.label
                  }
                </p>
                <h2 className="truncate text-lg font-bold text-[var(--admin-text)]">
                  {selected.name}
                </h2>
              </div>
            </div>

            <div className="max-w-3xl">
              {selected.id === "mercado-pago" && <MercadoPagoIntegrationCard />}
              {selected.id === "melhor-envio" && <MelhorEnvioIntegrationCard />}
              {selected.id === "brevo" && <BrevoIntegrationCard />}
              {selected.id === "meta-catalog" && <MetaCatalogIntegrationCard />}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)]">
              <div className="relative px-5 py-6 sm:px-7 sm:py-8">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(196,82,42,0.12),transparent_55%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)]"
                />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[var(--admin-accent-soft)] p-3">
                      <Plug className="size-6 text-[var(--admin-accent)]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-[var(--admin-text)] sm:text-2xl">
                        Central de integrações
                      </h2>
                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--admin-text-secondary)]">
                        Conecte pagamentos, envios, marketing, marketplaces e
                        redes sociais em um só lugar. Cada integração fica
                        isolada e pronta para crescer.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 sm:shrink-0">
                    <div className="rounded-xl border border-[var(--admin-border)] bg-white/80 px-4 py-3 text-center backdrop-blur-sm">
                      <p className="text-lg font-bold text-[var(--admin-text)]">
                        {availableCount}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                        Prontas
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--admin-border)] bg-white/80 px-4 py-3 text-center backdrop-blur-sm">
                      <p className="text-lg font-bold text-[var(--admin-text)]">
                        {INTEGRATION_CATEGORIES.reduce(
                          (total, category) =>
                            total +
                            getIntegrationsByCategory(category.id).length,
                          0
                        )}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                        No catálogo
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {INTEGRATION_CATEGORIES.map(category => {
              const items = getIntegrationsByCategory(category.id);
              return (
                <section key={category.id} className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold tracking-tight text-[var(--admin-text)]">
                        {category.label}
                      </h3>
                      <p className="mt-0.5 text-sm text-[var(--admin-text-muted)]">
                        {category.description}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--admin-text-muted)]">
                      {items.filter(i => i.availability === "available").length}/
                      {items.length} disponíveis
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map(integration => (
                      <IntegrationTile
                        key={integration.id}
                        integration={integration}
                        liveStatus={liveStatus[integration.id]}
                        onSelect={openIntegration}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
