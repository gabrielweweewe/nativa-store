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
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[#E8D5C4] bg-[#F5F0E8]/50 p-8 text-center text-[#8B6F5E]">
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
              className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-[#E8D5C4] bg-[#F5F0E8]"
            >
              <img src={url} alt={`Imagem ${index + 1}`} className="size-full object-cover" />

              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-[#C4522A] px-2 py-0.5 text-[10px] font-semibold text-white">
                  <Star className="size-3 fill-current" />
                  Capa
                </span>
              )}

              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
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

              <GripVertical className="pointer-events-none absolute bottom-1 right-1 size-4 text-white/70 drop-shadow" />
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
          className="border-[#C4522A]/40 text-[#C4522A] hover:bg-[#C4522A]/10"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Spinner className="size-4" /> : <Upload className="size-4" />}
          Enviar imagem
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      </div>
      <p className="text-xs text-[#8B6F5E]">
        Arraste as imagens para reordenar. A primeira imagem é usada como capa do produto. Formatos aceitos: JPG, PNG, WEBP (até 4MB cada).
      </p>
    </div>
  );
}
