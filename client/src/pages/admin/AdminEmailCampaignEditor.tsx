import AdminLayout from "@/components/admin/AdminLayout";
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
import { Textarea } from "@/components/ui/textarea";
import {
  AdminApiError,
  createBrevoCampaign,
  fetchBrevoCampaign,
  fetchBrevoLists,
  fetchBrevoSenders,
  fetchBrevoTemplates,
  sendBrevoTestEmail,
  updateBrevoCampaign,
  type BrevoList,
  type BrevoSender,
  type BrevoTemplate,
} from "@/lib/adminApi";
import { Code2, Eye, Mail, Save, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

const starterHtml = `<div style="margin:0;padding:32px;background:#faf7f2;font-family:Arial,sans-serif;color:#3d2b1f">
  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:16px;padding:32px">
    <h1 style="color:#c4522a">Novidades da Nativa</h1>
    <p>Olá! Preparamos uma seleção especial para você.</p>
    <p><a href="https://www.nativa.art.br" style="display:inline-block;padding:12px 20px;background:#2d6a4f;color:#fff;text-decoration:none;border-radius:999px">Conhecer a coleção</a></p>
    <p style="margin-top:32px;font-size:12px;color:#8b6f5e">Você recebeu este e-mail porque aceitou novidades da Nativa. <a href="{{ unsubscribe }}">Cancelar inscrição</a>.</p>
  </div>
</div>`;

export default function AdminEmailCampaignEditor() {
  const params = useParams<{ id?: string }>();
  const campaignId = params.id;
  const [, setLocation] = useLocation();
  const [senders, setSenders] = useState<BrevoSender[]>([]);
  const [lists, setLists] = useState<BrevoList[]>([]);
  const [templates, setTemplates] = useState<BrevoTemplate[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState(starterHtml);
  const [senderId, setSenderId] = useState("");
  const [listIds, setListIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [senderData, listData, templateData, campaign] = await Promise.all([
          fetchBrevoSenders(),
          fetchBrevoLists(),
          fetchBrevoTemplates().catch(() => []),
          campaignId ? fetchBrevoCampaign(campaignId) : Promise.resolve(null),
        ]);
        setSenders(senderData);
        setLists(listData);
        setTemplates(templateData);
        if (campaign) {
          setName(campaign.name);
          setSubject(campaign.subject);
          setHtmlContent(campaign.htmlContent || starterHtml);
          setSenderId(campaign.senderId ? String(campaign.senderId) : "");
          setListIds(campaign.listIds ?? []);
        } else if (senderData[0]) {
          setSenderId(String(senderData[0].id));
        }
      } catch (error) {
        toast.error(
          error instanceof AdminApiError
            ? error.message
            : "Não foi possível carregar o editor"
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [campaignId]);

  const isValid =
    name.trim() &&
    subject.trim() &&
    htmlContent.trim() &&
    senderId &&
    listIds.length > 0;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid) {
      toast.error("Preencha nome, assunto, remetente, lista e conteúdo");
      return;
    }
    setSaving(true);
    try {
      const selectedSender = senders.find(sender => String(sender.id) === senderId);
      if (!selectedSender) throw new AdminApiError("Selecione um remetente válido");
      const input = {
        name: name.trim(),
        subject: subject.trim(),
        htmlContent,
        senderId: selectedSender.id,
        listIds,
      };
      if (campaignId) {
        await updateBrevoCampaign(campaignId, input);
      } else {
        await createBrevoCampaign(input);
      }
      toast.success("Campanha salva como rascunho");
      setLocation("/admin/email-marketing/campanhas");
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testEmail || !senderId || !subject.trim() || !htmlContent.trim()) return;
    setTesting(true);
    try {
      const selectedSender = senders.find(sender => String(sender.id) === senderId);
      if (!selectedSender) throw new AdminApiError("Selecione um remetente válido");
      await sendBrevoTestEmail({
        email: testEmail.trim(),
        subject: subject.trim(),
        htmlContent,
        senderId: selectedSender.id,
      });
      toast.success("E-mail de teste enviado");
      setTestOpen(false);
    } catch (error) {
      toast.error(
        error instanceof AdminApiError ? error.message : "Erro ao enviar teste"
      );
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout title={campaignId ? "Editar campanha" : "Nova campanha"} backHref="/admin/email-marketing/campanhas">
        <div className="flex justify-center p-16"><Spinner className="size-7" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={campaignId ? "Editar campanha" : "Nova campanha"}
      backHref="/admin/email-marketing/campanhas"
    >
      <form onSubmit={save} className="mx-auto max-w-7xl space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)]">
          <div className="space-y-4">
            <Card className="admin-card grid gap-4 border-0 p-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="campaign-name">Nome interno</Label>
                <Input
                  id="campaign-name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="Ex.: Coleção de inverno"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="campaign-subject">Assunto do e-mail</Label>
                <Input
                  id="campaign-subject"
                  value={subject}
                  onChange={event => setSubject(event.target.value)}
                  placeholder="Novidades feitas à mão para você"
                  maxLength={150}
                />
              </div>
              <div className="space-y-2">
                <Label>Remetente</Label>
                <Select value={senderId} onValueChange={setSenderId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {senders.map(sender => (
                      <SelectItem key={sender.id} value={String(sender.id)}>
                        {sender.name} — {sender.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Usar template</Label>
                <Select
                  onValueChange={value => {
                    const template = templates.find(item => String(item.id) === value);
                    if (!template) return;
                    if (template.subject) setSubject(template.subject);
                    if (template.htmlContent) setHtmlContent(template.htmlContent);
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <fieldset className="space-y-2 sm:col-span-2">
                <legend className="text-sm font-medium">Listas destinatárias</legend>
                <div className="grid gap-2 rounded-xl border border-[var(--admin-border)] p-3 sm:grid-cols-2">
                  {lists.map(list => (
                    <label key={list.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={listIds.includes(list.id)}
                        onCheckedChange={checked =>
                          setListIds(current =>
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
            </Card>

            <Card className="admin-card overflow-hidden border-0">
              <div className="flex items-center gap-2 border-b border-[var(--admin-border)] px-4 py-3">
                <Code2 className="size-4 text-emerald-600" />
                <Label htmlFor="campaign-html">Editor HTML</Label>
              </div>
              <Textarea
                id="campaign-html"
                value={htmlContent}
                onChange={event => setHtmlContent(event.target.value)}
                className="min-h-[32rem] resize-y rounded-none border-0 font-mono text-xs focus-visible:ring-0"
                spellCheck={false}
              />
            </Card>
          </div>

          <Card className="admin-card h-fit border-0 p-4 xl:sticky xl:top-20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-emerald-600" />
                <h2 className="font-bold text-[var(--admin-text)]">Preview seguro</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMobilePreview(value => !value)}
              >
                {mobilePreview ? "Desktop" : "Mobile"}
              </Button>
            </div>
            <div className="overflow-auto rounded-xl bg-slate-100 p-2">
              <iframe
                title="Pré-visualização da campanha"
                sandbox=""
                srcDoc={htmlContent}
                className={`mx-auto h-[38rem] rounded-lg border bg-white transition-[width] ${
                  mobilePreview ? "w-[320px] max-w-full" : "w-full"
                }`}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
              Scripts, formulários e navegação ficam bloqueados no preview.
            </p>
          </Card>
        </div>

        <div className="sticky bottom-[4.25rem] z-10 flex flex-wrap justify-end gap-2 rounded-xl border border-[var(--admin-border)] bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-3">
          <Button type="button" variant="outline" className="gap-2" onClick={() => setTestOpen(true)}>
            <Send className="size-4" /> Enviar teste
          </Button>
          <Button type="submit" disabled={saving || !isValid} className="gap-2">
            {saving ? <Spinner className="size-4" /> : <Save className="size-4" />}
            Salvar rascunho
          </Button>
        </div>
      </form>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar e-mail de teste</DialogTitle>
            <DialogDescription>
              O teste não envia a campanha para as listas selecionadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="test-email">E-mail destinatário</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--admin-text-muted)]" />
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={event => setTestEmail(event.target.value)}
                className="pl-9"
                placeholder="voce@exemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Cancelar</Button>
            <Button disabled={testing || !testEmail} onClick={() => void sendTest()}>
              {testing && <Spinner className="size-4" />} Enviar teste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
