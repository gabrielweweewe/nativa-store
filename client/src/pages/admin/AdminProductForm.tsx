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
import {
  ArrowLeft,
  CircleDollarSign,
  HelpCircle,
  ImageIcon,
  Info,
  Layers,
  Plus,
  Save,
  TextQuote,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link, useLocation, useParams } from "wouter";

const CATEGORIES = ["Roupas", "Bolsas", "Acessórios"] as const;

const FORM_TABS = [
  { value: "geral", label: "Geral", short: "Geral", icon: Info },
  { value: "preco", label: "Preço & Estoque", short: "Preço", icon: CircleDollarSign },
  { value: "imagens", label: "Imagens", short: "Fotos", icon: ImageIcon },
  { value: "variacoes", label: "Variações", short: "Vars.", icon: Layers },
  { value: "descricao", label: "Descrição & SEO", short: "Texto", icon: TextQuote },
  { value: "artesao", label: "Artesão & FAQ", short: "FAQ", icon: HelpCircle },
] as const;

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-[var(--admin-border)] shadow-[var(--admin-shadow)] lg:border-[#E8D5C4] lg:shadow-sm">
      <CardHeader className="space-y-1 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3.5 sm:px-6 sm:py-4 lg:border-[#E8D5C4]/">
        <CardTitle className="text-base font-bold tracking-tight text-[var(--admin-text)] sm:text-lg">
          {title}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed text-[var(--admin-text-secondary)] sm:text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-4 sm:px-6 sm:py-5">{children}</CardContent>
    </Card>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export default function AdminProductForm() {
  const params = useParams<{ slug?: string }>();
  const isEditing = Boolean(params.slug);
  const [, setLocation] = useLocation();
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [descPreview, setDescPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");

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

  const actionButtons = (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11 flex-1 rounded-xl lg:h-9 lg:flex-none lg:rounded-md"
        onClick={() => setLocation("/admin/produtos")}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        disabled={isSaving}
        className="nativa-btn-primary h-11 flex-[1.4] rounded-xl lg:h-9 lg:flex-none lg:rounded-md"
      >
        {isSaving ? <Spinner className="size-4" /> : <Save className="size-4" />}
        {isEditing ? "Salvar" : "Criar"}
        <span className="hidden sm:inline">{isEditing ? " alterações" : " produto"}</span>
      </Button>
    </>
  );

  if (isLoadingProduct) {
    return (
      <AdminLayout title={isEditing ? "Editar produto" : "Novo produto"} backHref="/admin/produtos">
        <div className="flex items-center justify-center gap-2 p-12 text-[var(--admin-text-muted)]">
          <Spinner className="size-5" />
          Carregando produto...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEditing ? "Editar produto" : "Novo produto"}
      backHref="/admin/produtos"
      actions={
        <Button variant="outline" asChild>
          <Link href="/admin/produtos">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:gap-4 lg:pb-24"
      >
        {isEditing && name ? (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3 shadow-[var(--admin-shadow)] lg:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
              Editando
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-[var(--admin-text)]">{name}</p>
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3 sm:gap-4">
          <div className="sticky top-[calc(3.25rem+env(safe-area-inset-top,0px))] z-10 -mx-3 bg-[var(--admin-bg)]/95 px-3 py-2 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            <TabsList className="admin-product-tabs-list h-auto w-full justify-start gap-1.5 overflow-x-auto rounded-2xl bg-[var(--admin-surface)] p-1.5 shadow-[var(--admin-shadow)] lg:h-auto lg:w-fit lg:flex-wrap lg:rounded-lg lg:bg-muted lg:p-[3px] lg:shadow-none">
              {FORM_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="admin-product-tab shrink-0 gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold data-[state=active]:bg-[var(--admin-text)] data-[state=active]:text-white data-[state=active]:shadow-sm lg:rounded-md lg:px-2 lg:py-1 lg:text-sm lg:font-medium lg:data-[state=active]:bg-background lg:data-[state=active]:text-foreground"
                  >
                    <Icon className="size-3.5 lg:hidden" />
                    <span className="lg:hidden">{tab.short}</span>
                    <span className="hidden lg:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Geral */}
          <TabsContent value="geral" className="mt-0">
            <FormSection
              title="Informações gerais"
              description="Nome, categoria e identificação do produto."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="name">Nome do produto *</Label>
                  <Input
                    id="name"
                    className="h-11 rounded-xl lg:h-9 lg:rounded-md"
                    {...register("name")}
                    placeholder="Ex: Bolsa de Praia Mandala"
                  />
                  <FieldError message={errors.name?.message} />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="slug">Slug (URL) *</Label>
                  <Input
                    id="slug"
                    className="h-11 rounded-xl font-mono text-sm lg:h-9 lg:rounded-md"
                    {...register("slug", { onChange: () => setSlugTouched(true) })}
                    placeholder="bolsa-de-praia-mandala"
                  />
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    Gerado automaticamente a partir do nome. Usado na URL (/produto/...).
                  </p>
                  <FieldError message={errors.slug?.message} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Categoria *</Label>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11 w-full rounded-xl lg:h-9 lg:rounded-md">
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
                  <Input
                    id="sku"
                    className="h-11 rounded-xl lg:h-9 lg:rounded-md"
                    {...register("sku")}
                    placeholder="Ex: BOL-001"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="badge">Selo (badge)</Label>
                  <Input
                    id="badge"
                    className="h-11 rounded-xl lg:h-9 lg:rounded-md"
                    {...register("badge")}
                    placeholder="Ex: Mais vendido"
                  />
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
                          className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-input lg:h-9 lg:rounded-md"
                        />
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          className="h-11 flex-1 rounded-xl lg:h-9 lg:rounded-md"
                        />
                      </div>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-3.5 sm:col-span-2 lg:rounded-lg lg:border-[#E8D5C4] lg:bg-transparent">
                  <div className="min-w-0">
                    <Label htmlFor="featured">Produto em destaque</Label>
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      Aparece nas seções de destaque da loja.
                    </p>
                  </div>
                  <Controller
                    control={control}
                    name="featured"
                    render={({ field }) => (
                      <Switch id="featured" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </div>
            </FormSection>
          </TabsContent>

          {/* Preço & Estoque */}
          <TabsContent value="preco" className="mt-0">
            <FormSection
              title="Preço & Estoque"
              description="Defina o valor de venda e o controle de estoque."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="price">Preço de venda (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-11 rounded-xl lg:h-9 lg:rounded-md"
                    {...register("price", { valueAsNumber: true })}
                  />
                  <FieldError message={errors.price?.message} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="originalPrice">Preço original (promoção)</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-11 rounded-xl lg:h-9 lg:rounded-md"
                    placeholder="Em branco = sem promoção"
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
                    className="h-11 rounded-xl lg:h-9 lg:rounded-md"
                    {...register("stockCount", { valueAsNumber: true })}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-3.5 lg:rounded-lg lg:border-[#E8D5C4] lg:bg-transparent">
                  <Label htmlFor="inStock">Disponível para venda</Label>
                  <Controller
                    control={control}
                    name="inStock"
                    render={({ field }) => (
                      <Switch id="inStock" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </div>
            </FormSection>
          </TabsContent>

          {/* Imagens */}
          <TabsContent value="imagens" className="mt-0">
            <FormSection
              title="Imagens do produto"
              description="Adicione fotos por upload ou URL. A primeira imagem é a capa."
            >
              <Controller
                control={control}
                name="images"
                render={({ field }) => <ImageManager value={field.value} onChange={field.onChange} />}
              />
              <FieldError message={errors.images?.message} />
            </FormSection>
          </TabsContent>

          {/* Variações */}
          <TabsContent value="variacoes" className="mt-0">
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              <FormSection title="Tamanhos" description="Tamanhos disponíveis para este produto.">
                <div className="flex flex-col gap-3">
                  {sizesArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex flex-col gap-2 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-3 sm:flex-row sm:items-center sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
                    >
                      <Input
                        {...register(`sizes.${index}.label`)}
                        placeholder="Ex: P, M, G ou Único"
                        className="h-11 flex-1 rounded-xl lg:h-9 lg:rounded-md"
                      />
                      <div className="flex items-center justify-between gap-2 sm:justify-start">
                        <div className="flex items-center gap-1.5 whitespace-nowrap text-sm text-[var(--admin-text-secondary)]">
                          <Controller
                            control={control}
                            name={`sizes.${index}.available`}
                            render={({ field: switchField }) => (
                              <Switch
                                checked={switchField.value}
                                onCheckedChange={switchField.onChange}
                              />
                            )}
                          />
                          Disponível
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          onClick={() => sizesArray.remove(index)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 w-full rounded-xl sm:h-8 sm:w-fit sm:rounded-md"
                    onClick={() => sizesArray.append({ label: "", available: true })}
                  >
                    <Plus className="size-4" />
                    Adicionar tamanho
                  </Button>
                </div>
              </FormSection>

              <FormSection title="Cores" description="Cores disponíveis (opcional).">
                <div className="flex flex-col gap-3">
                  {colorsArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
                    >
                      <Controller
                        control={control}
                        name={`colors.${index}.hex`}
                        render={({ field: colorField }) => (
                          <input
                            type="color"
                            value={colorField.value}
                            onChange={colorField.onChange}
                            className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-input lg:h-9 lg:w-10 lg:rounded-md"
                          />
                        )}
                      />
                      <Input
                        {...register(`colors.${index}.name`)}
                        placeholder="Nome da cor"
                        className="h-11 flex-1 rounded-xl lg:h-9 lg:rounded-md"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
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
                    className="h-11 w-full rounded-xl sm:h-8 sm:w-fit sm:rounded-md"
                    onClick={() => colorsArray.append({ name: "", hex: "#C4522A" })}
                  >
                    <Plus className="size-4" />
                    Adicionar cor
                  </Button>
                </div>
              </FormSection>
            </div>
          </TabsContent>

          {/* Descrição & SEO */}
          <TabsContent value="descricao" className="mt-0">
            <FormSection title="Descrição & SEO" description="Textos exibidos na página do produto.">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="shortDescription">Descrição curta</Label>
                  <Textarea
                    id="shortDescription"
                    rows={2}
                    className="rounded-xl lg:rounded-md"
                    {...register("shortDescription")}
                    placeholder="Resumo curto, usado em listagens e SEO"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="description">Descrição completa</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setDescPreview((p) => !p)}
                    >
                      {descPreview ? "Editar" : "Pré-visualizar"}
                    </Button>
                  </div>
                  {descPreview ? (
                    <div
                      className="product-description min-h-[160px] rounded-xl border border-input p-3 lg:rounded-md"
                      dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(description || "") }}
                    />
                  ) : (
                    <Textarea
                      id="description"
                      rows={8}
                      className="rounded-xl font-mono text-sm lg:rounded-md"
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
                        <TagsInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Ex: Lavar à mão"
                        />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Destaques (tags)</Label>
                    <Controller
                      control={control}
                      name="highlights"
                      render={({ field }) => (
                        <TagsInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Ex: Frete grátis"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </FormSection>
          </TabsContent>

          {/* Artesão & FAQ */}
          <TabsContent value="artesao" className="mt-0">
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              <FormSection title="Artesão" description="História de quem produziu a peça.">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="artisanName">Nome</Label>
                    <Input
                      id="artisanName"
                      className="h-11 rounded-xl lg:h-9 lg:rounded-md"
                      {...register("artisan.name")}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="artisanRegion">Região</Label>
                    <Input
                      id="artisanRegion"
                      className="h-11 rounded-xl lg:h-9 lg:rounded-md"
                      {...register("artisan.region")}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="artisanStory">História</Label>
                    <Textarea
                      id="artisanStory"
                      rows={4}
                      className="rounded-xl lg:rounded-md"
                      {...register("artisan.story")}
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection title="Perguntas frequentes" description="FAQ exibido na página do produto.">
                <div className="flex flex-col gap-3">
                  {faqArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex flex-col gap-2 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-3 lg:rounded-lg lg:border-[#E8D5C4] lg:bg-transparent"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          {...register(`faq.${index}.question`)}
                          placeholder="Pergunta"
                          className="h-11 flex-1 rounded-xl lg:h-9 lg:rounded-md"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          onClick={() => faqArray.remove(index)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                      <Textarea
                        {...register(`faq.${index}.answer`)}
                        placeholder="Resposta"
                        rows={2}
                        className="rounded-xl lg:rounded-md"
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 w-full rounded-xl sm:h-8 sm:w-fit sm:rounded-md"
                    onClick={() => faqArray.append({ question: "", answer: "" })}
                  >
                    <Plus className="size-4" />
                    Adicionar pergunta
                  </Button>
                </div>
              </FormSection>
            </div>
          </TabsContent>
        </Tabs>

        {/* Mobile: acima da bottom nav */}
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-[var(--admin-border)] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-2">{actionButtons}</div>
        </div>

        {/* Desktop: barra inferior padrão */}
        <div className="fixed inset-x-0 bottom-0 z-20 hidden border-t border-[#E8D5C4] bg-white/95 p-3 backdrop-blur-sm lg:block lg:pl-64">
          <div className="flex items-center justify-end gap-2 px-3">{actionButtons}</div>
        </div>
      </form>
    </AdminLayout>
  );
}
