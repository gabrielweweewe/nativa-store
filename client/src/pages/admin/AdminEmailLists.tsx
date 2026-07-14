import AdminLayout from "@/components/admin/AdminLayout";
import EmailMarketingNav from "@/components/admin/EmailMarketingNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  AdminApiError,
  createBrevoList,
  deleteBrevoList,
  fetchBrevoLists,
  type BrevoList,
} from "@/lib/adminApi";
import { List, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminEmailLists() {
  const [lists, setLists] = useState<BrevoList[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLists(await fetchBrevoLists());
      } catch (error) {
        toast.error(
          error instanceof AdminApiError
            ? error.message
            : "Não foi possível carregar as listas"
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await createBrevoList(name.trim());
      setLists(current => [created, ...current]);
      setName("");
      toast.success("Lista criada");
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Erro ao criar lista");
    } finally {
      setSaving(false);
    }
  }

  async function remove(list: BrevoList) {
    if (!window.confirm(`Excluir a lista "${list.name}"? Os contatos serão mantidos.`)) {
      return;
    }
    try {
      await deleteBrevoList(list.id);
      setLists(current => current.filter(item => item.id !== list.id));
      toast.success("Lista excluída");
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Erro ao excluir lista");
    }
  }

  return (
    <AdminLayout title="Email Marketing">
      <div className="mx-auto max-w-5xl">
        <EmailMarketingNav />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="admin-card overflow-hidden border-0">
            <div className="border-b border-[var(--admin-border)] p-4">
              <h2 className="font-bold text-[var(--admin-text)]">Listas da Brevo</h2>
              <p className="text-sm text-[var(--admin-text-muted)]">
                Organize os públicos usados nas campanhas.
              </p>
            </div>
            {loading ? (
              <div className="flex justify-center p-10"><Spinner className="size-6" /></div>
            ) : lists.length === 0 ? (
              <div className="p-10 text-center text-sm text-[var(--admin-text-muted)]">
                Nenhuma lista encontrada.
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {lists.map(list => (
                  <article
                    key={list.id}
                    className="rounded-xl border border-[var(--admin-border)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-xl bg-emerald-50 p-2">
                        <List className="size-4 text-emerald-600" />
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--admin-text-muted)]">
                        <Users className="size-3.5" />
                        {list.totalSubscribers ?? 0}
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold text-[var(--admin-text)]">
                      {list.name}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                      ID {list.id}
                      {list.createdAt
                        ? ` · criada em ${new Date(list.createdAt).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-3 gap-2 text-red-600"
                      onClick={() => void remove(list)}
                    >
                      <Trash2 className="size-3.5" />
                      Excluir
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </Card>

          <Card className="admin-card h-fit border-0 p-4">
            <form onSubmit={create} className="space-y-4">
              <div>
                <h2 className="font-bold text-[var(--admin-text)]">Nova lista</h2>
                <p className="text-sm text-[var(--admin-text-muted)]">
                  A lista será criada diretamente na Brevo.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="list-name">Nome</Label>
                <Input
                  id="list-name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="Ex.: Clientes VIP"
                  maxLength={100}
                />
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={saving || !name.trim()}
              >
                {saving ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                Criar lista
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
