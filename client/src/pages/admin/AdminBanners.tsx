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
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  AdminApiError,
  createAdminBanner,
  deleteAdminBanner,
  fetchAdminBanners,
  reorderAdminBanners,
  updateAdminBanner,
  uploadProductImage,
} from "@/lib/adminApi";
import type { Banner, BannerInput } from "@shared/types/banner";
import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  ImagePlus,
  Link2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type BannerFormState = {
  title: string;
  altText: string;
  imageUrl: string;
  imageUrlMobile: string;
  linkUrl: string;
  objectPosition: string;
  objectPositionMobile: string;
  isActive: boolean;
};

const EMPTY_FORM: BannerFormState = {
  title: "",
  altText: "Banner Nativa",
  imageUrl: "",
  imageUrlMobile: "",
  linkUrl: "",
  objectPosition: "center center",
  objectPositionMobile: "center 22%",
  isActive: true,
};

function toFormState(banner: Banner): BannerFormState {
  return {
    title: banner.title,
    altText: banner.altText,
    imageUrl: banner.imageUrl,
    imageUrlMobile: banner.imageUrlMobile ?? "",
    linkUrl: banner.linkUrl ?? "",
    objectPosition: banner.objectPosition,
    objectPositionMobile: banner.objectPositionMobile,
    isActive: banner.isActive,
  };
}

function toInput(form: BannerFormState, sortOrder?: number): BannerInput {
  return {
    title: form.title.trim(),
    altText: form.altText.trim() || "Banner Nativa",
    imageUrl: form.imageUrl.trim(),
    imageUrlMobile: form.imageUrlMobile.trim() || null,
    linkUrl: form.linkUrl.trim() || null,
    objectPosition: form.objectPosition.trim() || "center center",
    objectPositionMobile: form.objectPositionMobile.trim() || "center 22%",
    isActive: form.isActive,
    sortOrder,
  };
}

function BannerImageField({
  label,
  hint,
  value,
  onChange,
  uploading,
  onUpload,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-[var(--admin-text-muted)]">{hint}</p>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
          <img src={value} alt="" className="h-36 w-full object-cover object-center sm:h-44" />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="size-8 rounded-full bg-white/95 shadow"
              onClick={() => inputRef.current?.click()}
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
              onClick={() => onChange("")}
              aria-label="Remover imagem"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-hover)]/50 text-[var(--admin-text-muted)] transition hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-accent-soft)]/40 sm:h-44"
        >
          {uploading ? <Spinner className="size-5" /> : <ImagePlus className="size-6 opacity-70" />}
          <span className="text-sm font-medium">
            {uploading ? "Enviando..." : "Enviar imagem"}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ou cole a URL da imagem"
        className="h-10 rounded-xl"
      />
    </div>
  );
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  async function loadBanners() {
    setIsLoading(true);
    try {
      const data = await fetchAdminBanners();
      setBanners(data);
    } catch {
      toast.error("Não foi possível carregar os banners");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBanners();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(banner: Banner) {
    setEditing(banner);
    setForm(toFormState(banner));
    setDialogOpen(true);
  }

  async function handleUpload(file: File, target: "desktop" | "mobile") {
    const setUploading = target === "desktop" ? setUploadingDesktop : setUploadingMobile;
    setUploading(true);
    try {
      const { url } = await uploadProductImage(file, "banners");
      setForm((prev) =>
        target === "desktop" ? { ...prev, imageUrl: url } : { ...prev, imageUrlMobile: url },
      );
      toast.success("Imagem enviada");
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.imageUrl.trim()) {
      toast.error("Adicione a imagem principal do banner");
      return;
    }
    if (!form.altText.trim()) {
      toast.error("Informe um texto alternativo (acessibilidade)");
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        const updated = await updateAdminBanner(editing.id, toInput(form, editing.sortOrder));
        setBanners((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        toast.success("Banner atualizado");
      } else {
        const created = await createAdminBanner(toInput(form));
        setBanners((prev) => [...prev, created]);
        toast.success("Banner criado");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Não foi possível salvar");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(banner: Banner) {
    try {
      const updated = await updateAdminBanner(banner.id, {
        title: banner.title,
        altText: banner.altText,
        imageUrl: banner.imageUrl,
        imageUrlMobile: banner.imageUrlMobile,
        linkUrl: banner.linkUrl,
        objectPosition: banner.objectPosition,
        objectPositionMobile: banner.objectPositionMobile,
        sortOrder: banner.sortOrder,
        isActive: !banner.isActive,
      });
      setBanners((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      toast.success(updated.isActive ? "Banner ativado" : "Banner desativado");
    } catch {
      toast.error("Não foi possível alterar o status");
    }
  }

  async function moveBanner(banner: Banner, direction: "up" | "down") {
    const index = banners.findIndex((b) => b.id === banner.id);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const next = [...banners];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    setBanners(next);
    setReorderingId(banner.id);

    try {
      const ordered = await reorderAdminBanners(next.map((b) => b.id));
      setBanners(ordered);
    } catch {
      toast.error("Não foi possível reordenar");
      await loadBanners();
    } finally {
      setReorderingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!bannerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAdminBanner(bannerToDelete.id);
      setBanners((prev) => prev.filter((b) => b.id !== bannerToDelete.id));
      toast.success("Banner excluído");
      setBannerToDelete(null);
    } catch {
      toast.error("Não foi possível excluir o banner");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AdminLayout
      title="Banners"
      actions={
        <Button onClick={openCreate} className="admin-btn-primary">
          <Plus className="size-4" />
          Novo banner
        </Button>
      }
    >
      <Card className="mb-4 border-[var(--admin-border)] p-4">
        <p className="text-sm text-[var(--admin-text-secondary)]">
          Gerencie as imagens do carrossel da página inicial. No celular, o visitante desliza
          entre os banners; no computador, as setas e os pontos também aparecem.
        </p>
      </Card>

      <div className="mb-3 flex justify-end sm:hidden">
        <Button onClick={openCreate} className="admin-btn-primary w-full">
          <Plus className="size-4" />
          Novo banner
        </Button>
      </div>

      <Card className="overflow-hidden border-[var(--admin-border)]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-[var(--admin-text-muted)]">
            <Spinner className="size-5" />
            Carregando banners...
          </div>
        ) : banners.length === 0 ? (
          <div className="space-y-4 p-4">
            <AdminEmptyState
              icon={<ImageIcon className="size-8" />}
              title="Nenhum banner cadastrado"
              description="Adicione o primeiro banner para aparecer no carrossel da loja."
            />
            <div className="flex justify-center pb-6">
              <Button onClick={openCreate} className="admin-btn-primary">
                <Plus className="size-4" />
                Criar banner
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--admin-border)]">
            {banners.map((banner, index) => (
              <li
                key={banner.id}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
              >
                <div className="relative h-28 w-full overflow-hidden rounded-xl bg-[var(--admin-surface-hover)] sm:h-24 sm:w-44 sm:shrink-0">
                  <img
                    src={banner.imageUrl}
                    alt={banner.altText}
                    className="size-full object-cover"
                  />
                  {!banner.isActive && (
                    <span className="absolute left-2 top-2 rounded-full bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Inativo
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-semibold text-[var(--admin-text)]">
                    {banner.title || `Banner ${index + 1}`}
                  </p>
                  <p className="truncate text-xs text-[var(--admin-text-muted)]">{banner.altText}</p>
                  {banner.linkUrl && (
                    <p className="flex items-center gap-1 truncate text-xs text-[var(--admin-accent)]">
                      <Link2 className="size-3 shrink-0" />
                      {banner.linkUrl}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={banner.isActive}
                      onCheckedChange={() => handleToggleActive(banner)}
                      aria-label={banner.isActive ? "Desativar banner" : "Ativar banner"}
                    />
                    <span className="text-xs text-[var(--admin-text-muted)]">
                      {banner.isActive ? "Visível na loja" : "Oculto"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-end lg:flex-row">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      disabled={index === 0 || reorderingId === banner.id}
                      onClick={() => moveBanner(banner, "up")}
                      aria-label="Mover para cima"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      disabled={index === banners.length - 1 || reorderingId === banner.id}
                      onClick={() => moveBanner(banner, "down")}
                      aria-label="Mover para baixo"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(banner)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setBannerToDelete(banner)}
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
            <DialogTitle>{editing ? "Editar banner" : "Novo banner"}</DialogTitle>
            <DialogDescription>
              Use uma imagem larga (recomendado ~1600×600). No celular, você pode enviar uma
              versão separada mais enquadrada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <BannerImageField
              label="Imagem principal"
              hint="Aparece no computador e no celular (se não houver imagem mobile)."
              value={form.imageUrl}
              onChange={(imageUrl) => setForm((prev) => ({ ...prev, imageUrl }))}
              uploading={uploadingDesktop}
              onUpload={(file) => handleUpload(file, "desktop")}
            />

            <BannerImageField
              label="Imagem para celular (opcional)"
              hint="Se quiser um enquadramento melhor no celular, envie uma segunda imagem."
              value={form.imageUrlMobile}
              onChange={(imageUrlMobile) => setForm((prev) => ({ ...prev, imageUrlMobile }))}
              uploading={uploadingMobile}
              onUpload={(file) => handleUpload(file, "mobile")}
            />

            <div className="space-y-2">
              <Label htmlFor="banner-title">Título interno</Label>
              <Input
                id="banner-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Coleção verão"
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-[var(--admin-text-muted)]">
                Só aparece no painel, para você identificar o banner.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-alt">Texto alternativo</Label>
              <Input
                id="banner-alt"
                value={form.altText}
                onChange={(e) => setForm((prev) => ({ ...prev, altText: e.target.value }))}
                placeholder="Descreva a imagem"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-link">Link ao clicar (opcional)</Label>
              <Input
                id="banner-link"
                value={form.linkUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
                placeholder="/produto/minha-bolsa ou https://..."
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="banner-pos">Foco da imagem (desktop)</Label>
                <Input
                  id="banner-pos"
                  value={form.objectPosition}
                  onChange={(e) => setForm((prev) => ({ ...prev, objectPosition: e.target.value }))}
                  placeholder="center center"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-pos-m">Foco no celular</Label>
                <Input
                  id="banner-pos-m"
                  value={form.objectPositionMobile}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, objectPositionMobile: e.target.value }))
                  }
                  placeholder="center 22%"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Exemplos: <code>center top</code>, <code>center 30%</code>, <code>left center</code>.
              Ajusta qual parte da imagem fica visível no recorte.
            </p>

            <div className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] px-3 py-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(isActive) => setForm((prev) => ({ ...prev, isActive }))}
                id="banner-active"
              />
              <Label htmlFor="banner-active" className="cursor-pointer">
                Exibir na loja
              </Label>
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
              disabled={isSaving || uploadingDesktop || uploadingMobile}
            >
              {isSaving ? <Spinner className="size-4" /> : null}
              {editing ? "Salvar alterações" : "Criar banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(bannerToDelete)}
        onOpenChange={(open) => !open && setBannerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir banner?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove o banner do carrossel. Não dá para desfazer.
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
