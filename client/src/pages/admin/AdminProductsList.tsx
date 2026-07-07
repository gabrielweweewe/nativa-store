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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteProduct } from "@/lib/adminApi";
import { formatPrice, fetchProducts } from "@/lib/products";
import type { Product, ProductCategory } from "@shared/types/product";
import { ImageOff, Package, Pencil, Plus, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const CATEGORIES: ProductCategory[] = ["Roupas", "Bolsas", "Acessórios"];

export default function AdminProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadProducts() {
    setIsLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch {
      toast.error("Não foi possível carregar os produtos");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesSearch =
        !search.trim() ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku.toLowerCase().includes(search.toLowerCase()) ||
        product.slug.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  async function handleConfirmDelete() {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.slug);
      toast.success(`"${productToDelete.name}" foi excluído`);
      setProducts((prev) => prev.filter((p) => p.slug !== productToDelete.slug));
      setProductToDelete(null);
    } catch {
      toast.error("Não foi possível excluir o produto");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AdminLayout
      title="Produtos"
      actions={
        <>
          <Button variant="outline" asChild className="border-[#C4522A]/40 text-[#C4522A] hover:bg-[#C4522A]/10">
            <Link href="/admin/produtos/importar">
              <Upload className="size-4" />
              Importar em massa
            </Link>
          </Button>
          <Button asChild className="nativa-btn-primary">
            <Link href="/admin/produtos/novo">
              <Plus className="size-4" />
              Novo produto
            </Link>
          </Button>
        </>
      }
    >
      <Card className="border-[#E8D5C4] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
            <Input
              placeholder="Buscar por nome, SKU ou slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="mt-4 border-[#E8D5C4]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-[#8B6F5E]">
            <Spinner className="size-5" />
            Carregando produtos...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-[#8B6F5E]">
            <Package className="size-8 opacity-50" />
            <p className="font-medium text-[#3D2B1F]">Nenhum produto encontrado</p>
            <p className="text-sm">Ajuste os filtros ou cadastre um novo produto.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14"></TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border border-[#E8D5C4] bg-[#F5F0E8]">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="size-full object-cover" />
                      ) : (
                        <ImageOff className="size-4 text-[#8B6F5E]" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <div className="flex items-center gap-1.5 truncate font-medium text-[#3D2B1F]">
                      {product.name}
                      {product.featured && <Sparkles className="size-3.5 shrink-0 text-[#E8821A]" />}
                    </div>
                    <div className="truncate text-xs text-[#8B6F5E]">{product.sku || product.slug}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-[#E8D5C4] text-[#3D2B1F]">
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-[#3D2B1F]">{formatPrice(product.price)}</div>
                    {product.originalPrice && (
                      <div className="text-xs text-[#8B6F5E] line-through">
                        {formatPrice(product.originalPrice)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{product.stockCount}</TableCell>
                  <TableCell>
                    <Badge
                      variant={product.inStock ? "secondary" : "destructive"}
                      className={product.inStock ? "bg-[#2D6A4F]/10 text-[#2D6A4F]" : ""}
                    >
                      {product.inStock ? "Em estoque" : "Sem estoque"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" asChild title="Editar">
                        <Link href={`/admin/produtos/${product.slug}/editar`}>
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Excluir"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setProductToDelete(product)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{productToDelete?.name}"? Essa ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? <Spinner className="size-4" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
