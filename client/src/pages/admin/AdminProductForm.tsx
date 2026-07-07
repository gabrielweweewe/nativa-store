import AdminLayout from "@/components/admin/AdminLayout";
import ImageManager from "@/components/admin/ImageManager";
import TagsInput from "@/components/admin/TagsInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AdminApiError, createProduct, updateProduct } from "@/lib/adminApi";
import { sanitizeProductHtml } from "@/lib/productHtml";
import { fetchProductBySlug } from "@/lib/products";
import { zodResolver } from "@hookform/resolvers/zod";
import { slugify } from "@shared/lib/slugify";
import { productDefaults, productSchema, type ProductInput } from "@shared/schemas/product";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link, useLocation, useParams } from "wouter";

const CATEGORIES = ["Roupas", "Bolsas", "Acessórios"] as const;

export default function AdminProductForm() {
  const params = useParams<{ slug?: string }>();
  const isEditing = Boolean(params.slug);
  const [, setLocation] = useLocation();
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [descPreview, setDescPreview] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: productDefaults,
    mode: "onBlur",
  });

  const sizesArray = useFieldArray({ control, name: "sizes" });
  const colorsArray = useFieldArray({ control, name: "colors" });
  const faqArray = useFieldArray({ control, name: "faq" });

  const images = watch("images");
  const name = watch("name");
  const description = watch("description");
  const originalPrice = watch("originalPrice");

  useEffect(() => {
    setValue("image", images?.[0] ?? "", { shouldValidate: false });
  }, [images, setValue]);

  useEffect(() => {
    if (!isEditing && !slugTouched) {
      setValue("slug", slugify(name || ""), { shouldValidate: false });
    }
  }, [name, isEditing, slugTouched, setValue]);

  useEffect(() => {
    if (!isEditing || !params.slug) return;

    fetchProductBySlug(params.slug)
      .then((product) => {
        if (!product) {
          toast.error("Produto não encontrado");
          setLocation("/admin/produtos");
          return;
        }
        const { id: _id, ...rest } = product;
        reset(rest);
      })
      .catch(() => toast.error("Não foi possível carregar o produto"))
      .finally(() => setIsLoadingProduct(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, params.slug]);

  async function onSubmit(data: ProductInput) {
    setIsSaving(true);
    try {
      if (isEditing && params.slug) {
        await updateProduct(params.slug, data);
        toast.success("Produto atualizado com sucesso");
      } else {
        await createProduct(data);
        toast.success("Produto criado com sucesso");
      }
      setLocation("/admin/produtos");
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Não foi possível salvar o produto");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoadingProduct) {
    return (
      <AdminLayout title={isEditing ? "Editar produto" : "Novo produto"}>
        <div className="flex items-center justify-center gap-2 p-12 text-[#8B6F5E]">
          <Spinner className="size-5" />
          Carregando produto...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEditing ? "Editar produto" : "Novo produto"}
      actions={
        <Button variant="outline" asChild>
          <Link href="/admin/produtos">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pb-24">
        <Tabs defaultValue="geral">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="preco">Preço & Estoque</TabsTrigger>
            <TabsTrigger value="imagens">Imagens</TabsTrigger>
            <TabsTrigger value="variacoes">Variações</TabsTrigger>
            <TabsTrigger value="descricao">Descrição & SEO</TabsTrigger>
            <TabsTrigger value="artesao">Artesão & FAQ</TabsTrigger>
          </TabsList>

          {/* Geral */}
          <TabsContent value="geral">
            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle>Informações gerais</CardTitle>
                <CardDescription>Nome, categoria e identificação do produto.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="name">Nome do produto *</Label>
                  <Input id="name" {...register("name")} placeholder="Ex: Bolsa de Praia Mandala" />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="slug">Slug (URL) *</Label>
                  <Input
                    id="slug"
                    {...register("slug", { onChange: () => setSlugTouched(true) })}
                    placeholder="bolsa-de-praia-mandala"
                  />
                  <p className="text-xs text-[#8B6F5E]">
                    Gerado automaticamente a partir do nome. Usado na URL do produto (/produto/...).
                  </p>
                  {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Categoria *</Label>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" {...register("sku")} placeholder="Ex: BOL-001" />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="badge">Selo (badge)</Label>
                  <Input id="badge" {...register("badge")} placeholder="Ex: Mais vendido" />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="badgeColor">Cor do selo</Label>
                  <Controller
                    control={control}
                    name="badgeColor"
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={field.value}
                          onChange={field.onChange}
                          className="h-9 w-12 shrink-0 cursor-pointer rounded border border-input"
                        />
                        <Input value={field.value} onChange={field.onChange} className="flex-1" />
                      </div>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#E8D5C4] p-3 sm:col-span-2">
                  <div>
                    <Label htmlFor="featured">Produto em destaque</Label>
                    <p className="text-xs text-[#8B6F5E]">Aparece nas seções de destaque da loja.</p>
                  </div>
                  <Controller
                    control={control}
                    name="featured"
                    render={({ field }) => (
                      <Switch id="featured" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preço & Estoque */}
          <TabsContent value="preco">
            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle>Preço & Estoque</CardTitle>
                <CardDescription>Defina o valor de venda e o controle de estoque.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="price">Preço de venda (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("price", { valueAsNumber: true })}
                  />
                  {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="originalPrice">Preço original (promoção)</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Deixe em branco se não houver promoção"
                    value={originalPrice ?? ""}
                    onChange={(e) =>
                      setValue("originalPrice", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="stockCount">Quantidade em estoque</Label>
                  <Input
                    id="stockCount"
                    type="number"
                    min="0"
                    {...register("stockCount", { valueAsNumber: true })}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#E8D5C4] p-3">
                  <Label htmlFor="inStock">Disponível para venda</Label>
                  <Controller
                    control={control}
                    name="inStock"
                    render={({ field }) => (
                      <Switch id="inStock" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Imagens */}
          <TabsContent value="imagens">
            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle>Imagens do produto</CardTitle>
                <CardDescription>Adicione fotos por upload ou URL. A primeira imagem é a capa.</CardDescription>
              </CardHeader>
              <CardContent>
                <Controller
                  control={control}
                  name="images"
                  render={({ field }) => <ImageManager value={field.value} onChange={field.onChange} />}
                />
                {errors.images && <p className="mt-2 text-sm text-destructive">{errors.images.message}</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variações */}
          <TabsContent value="variacoes">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-[#E8D5C4]">
                <CardHeader>
                  <CardTitle>Tamanhos</CardTitle>
                  <CardDescription>Tamanhos disponíveis para este produto.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {sizesArray.fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        {...register(`sizes.${index}.label`)}
                        placeholder="Ex: P, M, G ou Único"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1.5 whitespace-nowrap text-sm text-[#8B6F5E]">
                        <Controller
                          control={control}
                          name={`sizes.${index}.available`}
                          render={({ field: switchField }) => (
                            <Switch checked={switchField.value} onCheckedChange={switchField.onChange} />
                          )}
                        />
                        Disponível
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => sizesArray.remove(index)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => sizesArray.append({ label: "", available: true })}
                  >
                    <Plus className="size-4" />
                    Adicionar tamanho
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-[#E8D5C4]">
                <CardHeader>
                  <CardTitle>Cores</CardTitle>
                  <CardDescription>Cores disponíveis (opcional).</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {colorsArray.fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Controller
                        control={control}
                        name={`colors.${index}.hex`}
                        render={({ field: colorField }) => (
                          <input
                            type="color"
                            value={colorField.value}
                            onChange={colorField.onChange}
                            className="h-9 w-10 shrink-0 cursor-pointer rounded border border-input"
                          />
                        )}
                      />
                      <Input
                        {...register(`colors.${index}.name`)}
                        placeholder="Nome da cor"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => colorsArray.remove(index)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => colorsArray.append({ name: "", hex: "#C4522A" })}
                  >
                    <Plus className="size-4" />
                    Adicionar cor
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Descrição & SEO */}
          <TabsContent value="descricao">
            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle>Descrição & SEO</CardTitle>
                <CardDescription>Textos exibidos na página do produto.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="shortDescription">Descrição curta</Label>
                  <Textarea
                    id="shortDescription"
                    rows={2}
                    {...register("shortDescription")}
                    placeholder="Resumo curto, usado em listagens e SEO"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Descrição completa (aceita HTML simples)</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDescPreview((p) => !p)}>
                      {descPreview ? "Editar" : "Pré-visualizar"}
                    </Button>
                  </div>
                  {descPreview ? (
                    <div
                      className="product-description min-h-[160px] rounded-md border border-input p-3"
                      dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(description || "") }}
                    />
                  ) : (
                    <Textarea
                      id="description"
                      rows={8}
                      {...register("description")}
                      placeholder="<h3>Título</h3><p>Texto do produto...</p>"
                    />
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <Label>Materiais</Label>
                    <Controller
                      control={control}
                      name="materials"
                      render={({ field }) => (
                        <TagsInput value={field.value} onChange={field.onChange} placeholder="Ex: Algodão" />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Cuidados</Label>
                    <Controller
                      control={control}
                      name="careInstructions"
                      render={({ field }) => (
                        <TagsInput value={field.value} onChange={field.onChange} placeholder="Ex: Lavar à mão" />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Destaques (tags)</Label>
                    <Controller
                      control={control}
                      name="highlights"
                      render={({ field }) => (
                        <TagsInput value={field.value} onChange={field.onChange} placeholder="Ex: Frete grátis" />
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Artesão & FAQ */}
          <TabsContent value="artesao">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-[#E8D5C4]">
                <CardHeader>
                  <CardTitle>Artesão</CardTitle>
                  <CardDescription>História de quem produziu a peça.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="artisanName">Nome</Label>
                    <Input id="artisanName" {...register("artisan.name")} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="artisanRegion">Região</Label>
                    <Input id="artisanRegion" {...register("artisan.region")} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="artisanStory">História</Label>
                    <Textarea id="artisanStory" rows={4} {...register("artisan.story")} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E8D5C4]">
                <CardHeader>
                  <CardTitle>Perguntas frequentes</CardTitle>
                  <CardDescription>FAQ exibido na página do produto.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {faqArray.fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col gap-2 rounded-lg border border-[#E8D5C4] p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          {...register(`faq.${index}.question`)}
                          placeholder="Pergunta"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => faqArray.remove(index)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                      <Textarea {...register(`faq.${index}.answer`)} placeholder="Resposta" rows={2} />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => faqArray.append({ question: "", answer: "" })}
                  >
                    <Plus className="size-4" />
                    Adicionar pergunta
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E8D5C4] bg-white/95 p-3 backdrop-blur-sm lg:pl-64">
          <div className="flex items-center justify-end gap-2 px-3">
            <Button type="button" variant="outline" onClick={() => setLocation("/admin/produtos")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="nativa-btn-primary">
              {isSaving ? <Spinner className="size-4" /> : <Save className="size-4" />}
              {isEditing ? "Salvar alterações" : "Criar produto"}
            </Button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
