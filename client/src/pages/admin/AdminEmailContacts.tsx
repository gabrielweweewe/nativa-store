import AdminLayout from "@/components/admin/AdminLayout";
import EmailMarketingNav from "@/components/admin/EmailMarketingNav";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  AdminApiError,
  createBrevoContact,
  fetchBrevoContacts,
  fetchBrevoLists,
  removeBrevoContact,
  type BrevoContact,
  type BrevoList,
} from "@/lib/adminApi";
import { Plus, Search, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminEmailContacts() {
  const [contacts, setContacts] = useState<BrevoContact[]>([]);
  const [lists, setLists] = useState<BrevoList[]>([]);
  const [search, setSearch] = useState("");
  const [listFilter, setListFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedLists, setSelectedLists] = useState<number[]>([]);

  async function load(query = search, selectedList = listFilter) {
    setLoading(true);
    try {
      const [contactData, listData] = await Promise.all([
        fetchBrevoContacts({
          search: query.trim() || undefined,
          listId: selectedList === "all" ? undefined : Number(selectedList),
        }),
        lists.length ? Promise.resolve(lists) : fetchBrevoLists(),
      ]);
      setContacts(contactData);
      setLists(listData);
    } catch (error) {
      toast.error(
        error instanceof AdminApiError
          ? error.message
          : "Não foi possível carregar os contatos"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("", "all");
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || selectedLists.length === 0) return;
    setSaving(true);
    try {
      const created = await createBrevoContact({
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        listIds: selectedLists,
      });
      setContacts(current => [created, ...current]);
      setEmail("");
      setFirstName("");
      setLastName("");
      setSelectedLists([]);
      setDialogOpen(false);
      toast.success("Contato adicionado");
    } catch (error) {
      toast.error(
        error instanceof AdminApiError ? error.message : "Erro ao adicionar contato"
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(contact: BrevoContact) {
    if (!window.confirm(`Remover ${contact.email} da Brevo?`)) return;
    try {
      await removeBrevoContact(contact.email);
      setContacts(current => current.filter(item => item.id !== contact.id));
      toast.success("Contato removido");
    } catch (error) {
      toast.error(
        error instanceof AdminApiError ? error.message : "Erro ao remover contato"
      );
    }
  }

  return (
    <AdminLayout
      title="Email Marketing"
      actions={
        <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> Novo contato
        </Button>
      }
    >
      <div className="mx-auto max-w-6xl">
        <EmailMarketingNav />
        <Card className="admin-card border-0 p-3 sm:p-4">
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto]"
            onSubmit={event => {
              event.preventDefault();
              void load();
            }}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--admin-text-muted)]" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className="pl-9"
              />
            </div>
            <Select value={listFilter} onValueChange={setListFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas as listas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as listas</SelectItem>
                {lists.map(list => (
                  <SelectItem key={list.id} value={String(list.id)}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">Filtrar</Button>
          </form>
        </Card>

        <div className="mt-4 flex sm:hidden">
          <Button className="w-full gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> Novo contato
          </Button>
        </div>

        <Card className="admin-card mt-4 overflow-hidden border-0">
          {loading ? (
            <div className="flex justify-center p-12"><Spinner className="size-6" /></div>
          ) : contacts.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--admin-text-muted)]">
              Nenhum contato encontrado.
            </div>
          ) : (
            <div className="divide-y divide-[var(--admin-border)]">
              {contacts.map(contact => (
                <article
                  key={contact.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden rounded-full bg-emerald-50 p-2 sm:block">
                      <UserRound className="size-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--admin-text)]">
                        {[contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
                          "Sem nome"}
                      </p>
                      <p className="truncate text-sm text-[var(--admin-text-muted)]">
                        {contact.email}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(contact.listIds ?? []).map(id => (
                          <Badge key={id} variant="outline" className="text-[10px]">
                            {lists.find(list => list.id === id)?.name ?? `Lista ${id}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${contact.email}`}
                    onClick={() => void remove(contact)}
                  >
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={create}>
            <DialogHeader>
              <DialogTitle>Novo contato</DialogTitle>
              <DialogDescription>
                Adicione um contato com consentimento a uma ou mais listas.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="contact-email">E-mail</Label>
                <Input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-first-name">Nome</Label>
                <Input
                  id="contact-first-name"
                  value={firstName}
                  onChange={event => setFirstName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-last-name">Sobrenome</Label>
                <Input
                  id="contact-last-name"
                  value={lastName}
                  onChange={event => setLastName(event.target.value)}
                />
              </div>
              <fieldset className="space-y-2 sm:col-span-2">
                <legend className="text-sm font-medium">Listas</legend>
                <div className="grid gap-2 rounded-xl border border-[var(--admin-border)] p-3 sm:grid-cols-2">
                  {lists.map(list => (
                    <label key={list.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedLists.includes(list.id)}
                        onCheckedChange={checked =>
                          setSelectedLists(current =>
                            checked
                              ? [...current, list.id]
                              : current.filter(id => id !== list.id)
                          )
                        }
                      />
                      {list.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || selectedLists.length === 0}>
                {saving && <Spinner className="size-4" />} Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
