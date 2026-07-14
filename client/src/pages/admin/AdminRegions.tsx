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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminApiError,
  createAdminRegion,
  deleteAdminRegion,
  fetchAdminRegions,
  updateAdminRegion,
  uploadProductImage,
} from "@/lib/adminApi";
import { fetchProducts } from "@/lib/products";
import { slugify } from "@shared/lib/slugify";
import type { Product } from "@shared/types/product";
import type { Region, RegionInput } from "@shared/types/region";
import { ImagePlus, Map, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type RegionFormState = {
  id: string;
  name: string;
  title: string;
  story: string;
  coverImage: string;
  productIds: number[];
};

const EMPTY_FORM: RegionFormState = {
  id: "",
  name: "",
  title: "",
  story: "",
  coverImage: "",
  productIds: [],
};

function toFormState(region: Region): RegionFormState {
  return {
    id: region.id,
    name: region.name,
    title: region.title,
    story: region.story,
    coverImage: region.coverImage,
    productIds: region.productIds,
  };
}

function toInput(form: RegionFormState): RegionInput {
  return {
    id: form.id.trim(),
    name: form.name.trim(),
    title: form.title.trim(),
    story: form.story.trim(),
    coverImage: form.coverImage.trim(),
    productIds: form.productIds,
  };
}

export default function AdminRegions() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Region | null>(null);
  const [form, setForm] = useState<RegionFormState>(EMPTY_FORM);
  const [idTouched, setIdTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState<Region | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    setIsLoading(true);
    try {
      const [regionsData, productsData] = await Promise.all([fetchAdminRegions(), fetchProducts()]);
      setRegions(regionsData);
      setProducts(productsData);
    } catch {
      toast.error("Não foi possível carregar as regiões");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!editing && !idTouched) {
      setForm((prev) => ({ ...prev, id: slugify(prev.name) }));
    }
  }, [form.name, editing, idTouched]);

  function openCreate() {
    setEditing(null);
    setIdTouched(false);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(region: Region) {
    setEditing(region);
    setIdTouched(true);
    setForm(toFormState(region));
    setDialogOpen(true);
  }

  function toggleProduct(productId: number) {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const { url } = await uploadProductImage(file, "products");
      setForm((prev) => ({ ...prev, coverImage: url }));
      toast.success("Imagem enviada");
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.id.trim()) {
      toast.error("Informe o identificador da região");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Informe o nome da região");
      return;
    }
    if (!form.coverImage.trim()) {
      toast.error("Adicione a imagem de capa da região");
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        const updated = await updateAdminRegion(editing.id, toInput(form));
        setRegions((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        toast.success("Região atualizada");
      } else {
        const created = await createAdminRegion(toInput(form));
        setRegions((prev) => [...prev, created]);
        toast.success("Região criada");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Não foi possível salvar");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!regionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAdminRegion(regionToDelete.id);
      setRegions((prev) => prev.filter((r) => r.id !== regionToDelete.id));
      toast.success("Região excluída");
      setRegionToDelete(null);
    } catch {
      toast.error("Não foi possível excluir a região");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AdminLayout
      title="Mapa das Origens"
      actions={
        <Button onClick={openCreate} className="admin-btn-primary">
          <Plus className="size-4" />
          Nova região
        </Button>
      }
    >
      <Card className="mb-4 border-[var(--admin-border)] p-4">
        <p className="text-sm text-[var(--admin-text-secondary)]">
          Gerencie as histórias culturais do Mapa Vivo das Origens exibido na home e os produtos
          associados a cada região.
        </p>
      </Card>

      <div className="mb-3 flex justify-end sm:hidden">
        <Button onClick={openCreate} className="admin-btn-primary w-full">
          <Plus className="size-4" />
          Nova região
        </Button>
      </div>

      <Card className="overflow-hidden border-[var(--admin-border)]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-[var(--admin-text-muted)]">
            <Spinner className="size-5" />
            Carregando regiões...
          </div>
        ) : regions.length === 0 ? (
          <div className="space-y-4 p-4">
            <AdminEmptyState
              icon={<Map className="size-8" />}
              title="Nenhuma região cadastrada"
              description="Rode `pnpm seed:regions` ou crie a primeira região manualmente."
            />
            <div className="flex justify-center pb-6">
              <Button onClick={openCreate} className="admin-btn-primary">
                <Plus className="size-4" />
                Criar região
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--admin-border)]">
            {regions.map((region) => (
              <li
                key={region.id}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
              >
                <div className="relative h-24 w-full overflow-hidden rounded-xl bg-[var(--admin-surface-hover)] sm:h-20 sm:w-32 sm:shrink-0">
                  <img src={region.coverImage} alt={region.name} className="size-full object-cover" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-semibold text-[var(--admin-text)]">{region.name}</p>
                  <p className="truncate text-xs text-[var(--admin-text-muted)]">{region.title}</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    {region.productIds.length} produto(s) vinculado(s)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-end lg:flex-row">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(region)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setRegionToDelete(region)}
                  >
                    <Trash2 className="size-3.5" />
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar região" : "Nova região"}</DialogTitle>
            <DialogDescription>
              Conte a história cultural por trás da estampa e vincule os produtos dessa origem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Imagem de capa</Label>
              {form.coverImage ? (
                <div className="relative overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
                  <img src={form.coverImage} alt="" className="h-36 w-full object-cover object-center" />
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="secondary"
                      className="size-8 rounded-full bg-white/95 shadow"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      aria-label="Trocar imagem"
                    >
                      <Upload className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="secondary"
                      className="size-8 rounded-full bg-white/95 text-red-600 shadow"
                      onClick={() => setForm((prev) => ({ ...prev, coverImage: "" }))}
                      aria-label="Remover imagem"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-hover)]/50 text-[var(--admin-text-muted)] transition hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-accent-soft)]/40"
                >
                  {uploading ? <Spinner className="size-5" /> : <ImagePlus className="size-6 opacity-70" />}
                  <span className="text-sm font-medium">{uploading ? "Enviando..." : "Enviar imagem"}</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = "";
                }}
              />
              <Input
                value={form.coverImage}
                onChange={(e) => setForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                placeholder="Ou cole a URL da imagem"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region-name">Nome da região</Label>
              <Input
                id="region-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Sertão e litoral"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region-id">Identificador (slug)</Label>
              <Input
                id="region-id"
                value={form.id}
                onChange={(e) => {
                  setIdTouched(true);
                  setForm((prev) => ({ ...prev, id: slugify(e.target.value) }));
                }}
                placeholder="Ex: nordeste"
                disabled={Boolean(editing)}
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-[var(--admin-text-muted)]">
                Usado internamente para associar produtos. Não pode ser alterado depois de criado.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region-title">Título da história</Label>
              <Input
                id="region-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Flores e olhos místicos"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region-story">História da origem cultural</Label>
              <Textarea
                id="region-story"
                value={form.story}
                onChange={(e) => setForm((prev) => ({ ...prev, story: e.target.value }))}
                placeholder="Conte em 2-3 frases a origem cultural da estampa"
                className="min-h-24 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Produtos desta região</Label>
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-[var(--admin-border)] p-3">
                {products.length === 0 ? (
                  <p className="text-sm text-[var(--admin-text-muted)]">Nenhum produto cadastrado ainda.</p>
                ) : (
                  products.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--admin-surface-hover)]"
                    >
                      <Checkbox
                        checked={form.productIds.includes(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                      <span className="truncate text-[var(--admin-text)]">{product.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="admin-btn-primary"
              onClick={handleSave}
              disabled={isSaving || uploading}
            >
              {isSaving ? <Spinner className="size-4" /> : null}
              {editing ? "Salvar alterações" : "Criar região"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(regionToDelete)}
        onOpenChange={(open) => !open && setRegionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir região?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove a região do Mapa Vivo das Origens. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
