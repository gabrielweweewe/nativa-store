import AuthInputField from "@/components/auth/AuthInputField";
import AuthPageShell from "@/components/auth/AuthPageShell";
import OrdersEmptyState from "@/components/auth/OrdersEmptyState";
import RequireCustomerAuth from "@/components/RequireCustomerAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { fetchCustomerProfile, updateCustomerProfile } from "@/lib/customerApi";
import type { CustomerProfile } from "@shared/types/customer";
import { displayPhoneBr, formatPhoneBr, isValidPhoneBr, normalizePhoneBr } from "@shared/lib/phoneBr";
import { BadgeCheck, Lock, LogOut, Package, Phone, Shield, UserCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function CustomerAccountContent() {
  const { session, user, signOut, updatePassword } = useCustomerAuth();
  const [, setLocation] = useLocation();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const phoneDigits = normalizePhoneBr(phone);
  const phoneInvalid = phoneDigits.length > 0 && !isValidPhoneBr(phoneDigits);
  const passwordsMatch = newPassword === confirmPassword;
  const passwordHint = useMemo(() => {
    if (!newPassword) return "";
    if (newPassword.length < 8) return "Use pelo menos 8 caracteres";
    return "";
  }, [newPassword]);

  useEffect(() => {
    async function load() {
      if (!session?.access_token) return;
      setLoadingProfile(true);
      try {
        const data = await fetchCustomerProfile(session.access_token);
        setProfile(data);
        setFullName(data.fullName ?? "");
        setPhone(displayPhoneBr(data.phone));
      } catch (error) {
        toast("Erro ao carregar perfil", {
          description: error instanceof Error ? error.message : "Tente novamente",
        });
      } finally {
        setLoadingProfile(false);
      }
    }

    load();
  }, [session?.access_token]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token) return;

    if (phoneInvalid) {
      toast("Telefone inválido", { description: "Informe DDD + número com 10 ou 11 dígitos." });
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await updateCustomerProfile(session.access_token, {
        fullName: fullName.trim(),
        phone: phoneDigits,
      });
      setProfile(updated);
      setPhone(displayPhoneBr(updated.phone));
      toast("Dados atualizados", { description: "Seu perfil foi salvo com sucesso." });
    } catch (error) {
      toast("Erro ao salvar", { description: error instanceof Error ? error.message : "Tente novamente" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (passwordHint) {
      toast("Senha fraca", { description: passwordHint });
      return;
    }

    if (!passwordsMatch) {
      toast("Senhas não conferem", { description: "Verifique e tente novamente." });
      return;
    }

    setSavingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast("Senha alterada", { description: "Sua nova senha já está ativa." });
    } catch (error) {
      toast("Erro ao alterar senha", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      setLocation("/");
    }
  }

  const displayName = fullName.trim() || profile?.fullName || "Cliente Nativa";
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null;

  return (
    <AuthPageShell centered={false}>
      <div className="mx-auto w-full max-w-3xl">
        {/* Hero do perfil */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#C4522A] via-[#D4653A] to-[#E8821A] px-6 py-8 text-white shadow-[0_24px_60px_-20px_rgba(196,82,42,0.55)] md:px-8 md:py-10">
          <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-10 left-1/4 size-32 rounded-full bg-[#2D6A4F]/20 blur-2xl" aria-hidden />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold backdrop-blur-sm ring-1 ring-white/30"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {getInitials(displayName)}
              </div>
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Minha conta
                </p>
                <h1
                  className="mt-1 text-2xl font-bold md:text-3xl"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {displayName}
                </h1>
                <p className="mt-1 text-sm text-white/85" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {profile?.email ?? user?.email ?? ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {profile?.emailVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                      <BadgeCheck className="size-3.5" />
                      E-mail confirmado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/15 px-2.5 py-1 text-xs font-medium">
                      Confirme seu e-mail
                    </span>
                  )}
                  {memberSince && (
                    <span className="text-xs text-white/75" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      Cliente desde {memberSince}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={loadingProfile}
              className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <LogOut className="mr-2 size-4" />
              Sair
            </Button>
          </div>
        </section>

        {/* Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8 gap-6">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-2xl border border-[#E8D5C4] bg-white/80 p-1.5 shadow-sm">
            <TabsTrigger
              value="profile"
              className="flex-1 rounded-xl px-4 py-2.5 data-[state=active]:bg-[#C4522A] data-[state=active]:text-white data-[state=active]:shadow-md sm:flex-none"
            >
              <UserCircle className="size-4" />
              Meus dados
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="flex-1 rounded-xl px-4 py-2.5 data-[state=active]:bg-[#C4522A] data-[state=active]:text-white data-[state=active]:shadow-md sm:flex-none"
            >
              <Package className="size-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex-1 rounded-xl px-4 py-2.5 data-[state=active]:bg-[#C4522A] data-[state=active]:text-white data-[state=active]:shadow-md sm:flex-none"
            >
              <Shield className="size-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="border-[#E8D5C4]/90 bg-white/95 shadow-lg">
              <CardContent className="p-6 md:p-8">
                {loadingProfile ? (
                  <div className="flex items-center justify-center py-16">
                    <Spinner className="size-7 text-[#C4522A]" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
                    <div>
                      <h2
                        className="text-lg font-semibold text-[#3D2B1F]"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        Dados pessoais
                      </h2>
                      <p
                        className="mt-1 text-sm text-[#8B6F5E]"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                      >
                        Mantenha seu nome e telefone atualizados para facilitar entregas e contato.
                      </p>
                    </div>

                    <AuthInputField
                      id="customer-profile-name"
                      label="Nome completo"
                      icon={UserCircle}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome"
                      autoComplete="name"
                      disabled={savingProfile}
                    />

                    <AuthInputField
                      id="customer-profile-phone"
                      label="Telefone (WhatsApp)"
                      icon={Phone}
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
                      placeholder="(11) 99999-9999"
                      autoComplete="tel"
                      inputMode="tel"
                      disabled={savingProfile}
                      error={phoneInvalid ? "Informe um telefone válido com DDD" : undefined}
                    />

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-profile-email">E-mail</Label>
                      <Input
                        id="customer-profile-email"
                        value={profile?.email ?? user?.email ?? ""}
                        disabled
                        className="h-11 rounded-xl border-[#E8D5C4] bg-[#F5F0E8]/80"
                      />
                      <p className="text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        Para alterar o e-mail, entre em contato conosco.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-[#E8D5C4]/80 pt-5 sm:flex-row sm:items-center">
                      <Button
                        type="submit"
                        className="nativa-btn-primary rounded-xl px-8"
                        disabled={savingProfile || !fullName.trim() || phoneInvalid}
                      >
                        {savingProfile ? <Spinner className="size-4" /> : "Salvar dados"}
                      </Button>
                      {!!profile && (
                        <p className="text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                          Atualizado em {new Date(profile.updatedAt).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="border-[#E8D5C4]/90 bg-white/95 shadow-lg">
              <CardContent className="p-6 md:p-8">
                <div className="mb-6">
                  <h2
                    className="text-lg font-semibold text-[#3D2B1F]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Meus pedidos
                  </h2>
                  <p
                    className="mt-1 text-sm text-[#8B6F5E]"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    Acompanhe compras, status e entregas — tudo em um só lugar.
                  </p>
                </div>
                <OrdersEmptyState />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-[#E8D5C4]/90 bg-white/95 shadow-lg">
              <CardContent className="p-6 md:p-8">
                <div className="mb-6">
                  <h2
                    className="text-lg font-semibold text-[#3D2B1F]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Segurança da conta
                  </h2>
                  <p
                    className="mt-1 text-sm text-[#8B6F5E]"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    Altere sua senha periodicamente para manter sua conta protegida.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="flex max-w-md flex-col gap-4">
                  <AuthInputField
                    id="customer-new-password"
                    label="Nova senha"
                    icon={Lock}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Digite a nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={savingPassword}
                    hint={passwordHint || undefined}
                  />

                  <AuthInputField
                    id="customer-new-password-confirm"
                    label="Confirmar nova senha"
                    icon={Lock}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={savingPassword}
                    error={
                      !passwordsMatch && confirmPassword.length > 0
                        ? "As senhas não conferem"
                        : undefined
                    }
                  />

                  <Button
                    type="submit"
                    variant="outline"
                    className="w-fit rounded-xl border-[#C4522A]/30 px-6 text-[#C4522A] hover:bg-[#C4522A]/5"
                    disabled={
                      savingPassword ||
                      !newPassword ||
                      !confirmPassword ||
                      !passwordsMatch ||
                      !!passwordHint
                    }
                  >
                    {savingPassword ? <Spinner className="size-4" /> : "Alterar senha"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthPageShell>
  );
}

export default function CustomerAccount() {
  return (
    <RequireCustomerAuth>
      <CustomerAccountContent />
    </RequireCustomerAuth>
  );
}
