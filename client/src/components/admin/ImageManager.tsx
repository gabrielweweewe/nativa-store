import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AdminApiError, uploadProductImage } from "@/lib/adminApi";
import { GripVertical, ImageOff, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ImageManagerProps {
  value: string[];
  onChange: (images: string[]) => void;
}

/** Gerencia a galeria de imagens do produto: upload de arquivo, URL manual e reordenação por drag & drop. */
export default function ImageManager({ value, onChange }: ImageManagerProps) {
  const [urlDraft, setUrlDraft] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addImage(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
  }

  function handleAddUrl() {
    if (!urlDraft.trim()) return;
    addImage(urlDraft);
    setUrlDraft("");
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const { url } = await uploadProductImage(file);
        uploaded.push(url);
      } catch (error) {
        toast.error(error instanceof AdminApiError ? error.message : `Erro ao enviar ${file.name}`);
      }
    }

    if (uploaded.length > 0) {
      onChange([...value, ...uploaded]);
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function makeCover(index: number) {
    if (index === 0) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      return;
    }
    const next = [...value];
    const [item] = next.splice(dragIndex, 1);
    next.splice(index, 0, item);
    onChange(next);
    setDragIndex(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {value.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-hover)]/50 p-8 text-center text-[var(--admin-text-muted)]">
          <ImageOff className="size-6 opacity-60" />
          <p className="text-sm">Nenhuma imagem adicionada ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-hover)]"
            >
              <img src={url} alt={`Imagem ${index + 1}`} className="size-full object-cover" />

              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1 rounded-full bg-[var(--admin-accent)] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                  <Star className="size-3 fill-current" />
                  Capa
                </span>
              )}

              {/* Mobile: botões sempre visíveis */}
              <div className="absolute right-1.5 top-1.5 z-10 flex gap-1.5 sm:hidden">
                {index !== 0 && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    className="size-8 rounded-full bg-white/95 shadow-md backdrop-blur-sm"
                    title="Tornar capa"
                    aria-label="Tornar capa"
                    onClick={() => makeCover(index)}
                  >
                    <Star className="size-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  className="size-8 rounded-full shadow-md"
                  title="Remover"
                  aria-label="Remover imagem"
                  onClick={() => removeImage(index)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {/* Desktop: overlay no hover */}
              <div className="absolute inset-0 hidden items-center justify-center gap-1.5 bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100 sm:flex">
                {index !== 0 && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    title="Tornar capa"
                    onClick={() => makeCover(index)}
                  >
                    <Star className="size-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  title="Remover"
                  onClick={() => removeImage(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <GripVertical className="pointer-events-none absolute bottom-1 right-1 hidden size-4 text-white/70 drop-shadow sm:block" />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Cole a URL de uma imagem"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddUrl();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={handleAddUrl} disabled={!urlDraft.trim()}>
            Adicionar
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-[var(--admin-accent)]/40 text-[var(--admin-accent)] hover:bg-[var(--admin-accent-soft)]"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Spinner className="size-4" /> : <Upload className="size-4" />}
          Enviar imagem
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      </div>
      <p className="text-xs text-[var(--admin-text-muted)]">
        Arraste as imagens para reordenar. A primeira imagem é usada como capa do produto. Formatos aceitos: JPG, PNG, WEBP, GIF (até 4MB cada). GIFs mantêm a animação na loja e no admin.
      </p>
    </div>
  );
}
