import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminLayout from "@/components/admin/AdminLayout";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import {
  AdminApiError,
  createAdminCoupon,
  deleteAdminCoupon,
  fetchAdminCoupons,
  updateAdminCoupon,
} from "@/lib/adminApi";
import type { Coupon, CouponInput, CouponType } from "@shared/types/coupon";
import { Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type CouponFormState = {
  code: string;
  type: CouponType;
  value: string;
  isActive: boolean;
  isMapReward: boolean;
  startsAt: string;
  endsAt: string;
  minSubtotal: string;
  maxUses: string;
  maxUsesPerCustomer: string;
  description: string;
};

const EMPTY_FORM: CouponFormState = {
  code: "",
  type: "percentage",
  value: "15",
  isActive: true,
  isMapReward: false,
  startsAt: "",
  endsAt: "",
  minSubtotal: "",
  maxUses: "",
  maxUsesPerCustomer: "",
  description: "",
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toFormState(coupon: Coupon): CouponFormState {
  return {
    code: coupon.code,
    type: coupon.type,
    value: String(coupon.value),
    isActive: coupon.isActive,
    isMapReward: coupon.isMapReward,
    startsAt: toDatetimeLocal(coupon.startsAt),
    endsAt: toDatetimeLocal(coupon.endsAt),
    minSubtotal: coupon.minSubtotal != null ? String(coupon.minSubtotal) : "",
    maxUses: coupon.maxUses != null ? String(coupon.maxUses) : "",
    maxUsesPerCustomer:
      coupon.maxUsesPerCustomer != null ? String(coupon.maxUsesPerCustomer) : "",
    description: coupon.description ?? "",
  };
}

function toInput(form: CouponFormState): CouponInput {
  const valueNum = Number(form.value.replace(",", ".")) || 0;
  return {
    code: form.code.trim().toUpperCase(),
    type: form.type,
    value: form.type === "free_shipping" ? 0 : valueNum,
    isActive: form.isActive,
    isMapReward: form.isMapReward,
    startsAt: fromDatetimeLocal(form.startsAt),
    endsAt: fromDatetimeLocal(form.endsAt),
    minSubtotal: parseOptionalNumber(form.minSubtotal),
    maxUses: (() => {
      const n = parseOptionalNumber(form.maxUses);
      return n == null ? null : Math.trunc(n);
    })(),
    maxUsesPerCustomer: (() => {
      const n = parseOptionalNumber(form.maxUsesPerCustomer);
      return n == null ? null : Math.trunc(n);
    })(),
    description: form.description.trim() || null,
  };
}

function typeLabel(type: CouponType): string {
  switch (type) {
    case "percentage":
      return "Percentual";
    case "fixed":
      return "Valor fixo";
    case "free_shipping":
      return "Frete grátis";
  }
}

function formatCouponValue(coupon: Coupon): string {
  if (coupon.type === "percentage") return `${coupon.value}%`;
  if (coupon.type === "fixed") {
    return coupon.value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }
  return "—";
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  async function loadCoupons() {
    setLoading(true);
    try {
      setCoupons(await fetchAdminCoupons());
    } catch (error) {
      toast.error("Erro ao carregar cupons", {
        description: error instanceof AdminApiError ? error.message : "Tente novamente",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoupons();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditing(coupon);
    setForm(toFormState(coupon));
    setDialogOpen(true);
  }

  async function handleSave() {
    const input = toInput(form);
    if (!input.code) {
      toast.error("Informe o código do cupom");
      return;
    }
    if (input.type !== "free_shipping" && !(input.value > 0)) {
      toast.error("Informe um valor válido");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateAdminCoupon(editing.id, input);
        toast.success("Cupom atualizado");
      } else {
        await createAdminCoupon(input);
        toast.success("Cupom criado");
      }
      setDialogOpen(false);
      await loadCoupons();
    } catch (error) {
      toast.error(editing ? "Erro ao atualizar" : "Erro ao criar", {
        description: error instanceof AdminApiError ? error.message : "Tente novamente",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(coupon: Coupon) {
    try {
      await updateAdminCoupon(coupon.id, {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        isActive: !coupon.isActive,
        isMapReward: coupon.isMapReward,
        startsAt: coupon.startsAt,
        endsAt: coupon.endsAt,
        minSubtotal: coupon.minSubtotal,
        maxUses: coupon.maxUses,
        maxUsesPerCustomer: coupon.maxUsesPerCustomer,
        description: coupon.description,
      });
      toast.success(coupon.isActive ? "Cupom desativado" : "Cupom ativado");
      await loadCoupons();
    } catch (error) {
      toast.error("Erro ao alterar status", {
        description: error instanceof AdminApiError ? error.message : "Tente novamente",
      });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAdminCoupon(deleteTarget.id);
      toast.success("Cupom excluído");
      setDeleteTarget(null);
      await loadCoupons();
    } catch (error) {
      toast.error("Erro ao excluir", {
        description: error instanceof AdminApiError ? error.message : "Tente novamente",
      });
    }
  }

  return (
    <AdminLayout
      title="Cupons"
      actions={
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Novo cupom
        </Button>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-8" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="space-y-4">
            <AdminEmptyState
              icon={<Ticket className="size-10" />}
              title="Nenhum cupom"
              description="Crie cupons como NATIVA10 ou BORDADO5 para a loja."
            />
            <div className="flex justify-center">
              <Button type="button" onClick={openCreate}>
                <Plus className="size-4" />
                Criar cupom
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <Card
                key={coupon.id}
                className="flex flex-col gap-3 border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-semibold tracking-wide text-[var(--admin-text)]">
                      {coupon.code}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        coupon.isActive
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-zinc-500/15 text-zinc-600"
                      }`}
                    >
                      {coupon.isActive ? "Ativo" : "Inativo"}
                    </span>
                    <span className="rounded-full bg-[var(--admin-surface-hover)] px-2 py-0.5 text-xs text-[var(--admin-text-muted)]">
                      {typeLabel(coupon.type)}
                    </span>
                    {coupon.isMapReward && (
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700">
                        Mapa das Origens
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--admin-text-muted)]">
                    Valor: {formatCouponValue(coupon)}
                    {" · "}
                    Usos: {coupon.usageCount}
                    {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ""}
                    {coupon.description ? ` · ${coupon.description}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 pr-2">
                    <Switch
                      checked={coupon.isActive}
                      onCheckedChange={() => void handleToggleActive(coupon)}
                      aria-label={coupon.isActive ? "Desativar cupom" : "Ativar cupom"}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(coupon)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => setDeleteTarget(coupon)}
                  >
                    <Trash2 className="size-3.5" />
                    Excluir
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cupom" : "Novo cupom"}</DialogTitle>
            <DialogDescription>
              O código é único e não diferencia maiúsculas/minúsculas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Código</Label>
              <Input
                id="coupon-code"
                value={form.code}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                }
                placeholder="NATIVA10"
                className="uppercase"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: CouponType) =>
                    setForm((prev) => ({
                      ...prev,
                      type: value,
                      value: value === "free_shipping" ? "0" : prev.value || "15",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                    <SelectItem value="free_shipping">Frete grátis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.type !== "free_shipping" && (
                <div className="space-y-2">
                  <Label htmlFor="coupon-value">
                    {form.type === "percentage" ? "Percentual" : "Valor (R$)"}
                  </Label>
                  <Input
                    id="coupon-value"
                    type="number"
                    min={0}
                    step={form.type === "percentage" ? "1" : "0.01"}
                    value={form.value}
                    onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
              <Label htmlFor="coupon-active">Ativo</Label>
              <Switch
                id="coupon-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--admin-border)] px-3 py-2">
              <div className="min-w-0">
                <Label htmlFor="coupon-map-reward">Recompensa do Mapa das Origens</Label>
                <p className="text-xs text-[var(--admin-text-muted)]">
                  Este código aparece no passaporte ao explorar as 5 regiões. Só um cupom por vez.
                </p>
              </div>
              <Switch
                id="coupon-map-reward"
                checked={form.isMapReward}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isMapReward: checked }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-starts">Início (opcional)</Label>
                <Input
                  id="coupon-starts"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-ends">Fim (opcional)</Label>
                <Input
                  id="coupon-ends"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="coupon-min">Subtotal mínimo</Label>
                <Input
                  id="coupon-min"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Opcional"
                  value={form.minSubtotal}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, minSubtotal: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-max">Limite total</Label>
                <Input
                  id="coupon-max"
                  type="number"
                  min={1}
                  step="1"
                  placeholder="Opcional"
                  value={form.maxUses}
                  onChange={(e) => setForm((prev) => ({ ...prev, maxUses: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-per-customer">Por cliente</Label>
                <Input
                  id="coupon-per-customer"
                  type="number"
                  min={1}
                  step="1"
                  placeholder="Opcional"
                  value={form.maxUsesPerCustomer}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, maxUsesPerCustomer: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-desc">Descrição (opcional)</Label>
              <Textarea
                id="coupon-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Exibida na loja quando o cupom for aplicado"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
            <AlertDialogDescription>
              O código {deleteTarget?.code} deixará de funcionar na loja. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
