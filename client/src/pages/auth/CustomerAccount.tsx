import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import RequireCustomerAuth from "@/components/RequireCustomerAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { fetchCustomerProfile, updateCustomerProfile } from "@/lib/customerApi";
import type { CustomerProfile } from "@shared/types/customer";
import { displayPhoneBr, formatPhoneBr, isValidPhoneBr, normalizePhoneBr } from "@shared/lib/phoneBr";
import { BadgeCheck, Lock, Package, UserCircle } from "lucide-react";
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
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <Navbar />
      <main className="container px-4 py-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Card className="border-[#E8D5C4] shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{ background: "#C4522A", fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {getInitials(displayName)}
                  </div>
                  <div>
                    <h1
                      className="text-xl font-bold text-[#3D2B1F]"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {displayName}
                    </h1>
                    <p className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {profile?.email ?? user?.email ?? ""}
                    </p>
                    {profile?.emailVerified ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-[#2D6A4F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        <BadgeCheck className="size-3.5" />
                        E-mail confirmado
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-[#C4522A]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        Confirme seu e-mail para liberar todas as funcionalidades.
                      </p>
                    )}
                    {memberSince && (
                      <p className="mt-1 text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        Cliente desde {memberSince}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="outline" onClick={handleLogout} disabled={loadingProfile}>
                  Sair
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-[#E8D5C4] shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-[#3D2B1F]">
                <UserCircle className="size-5 text-[#C4522A]" />
                <h2 className="text-lg font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Dados pessoais
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner className="size-6 text-[#C4522A]" />
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="customer-profile-name">Nome completo</Label>
                    <Input
                      id="customer-profile-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome"
                      autoComplete="name"
                      disabled={savingProfile}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="customer-profile-phone">Telefone (WhatsApp)</Label>
                    <Input
                      id="customer-profile-phone"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
                      placeholder="(11) 99999-9999"
                      autoComplete="tel"
                      inputMode="tel"
                      disabled={savingProfile}
                    />
                    {phoneInvalid && (
                      <p className="text-xs text-destructive" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        Informe um telefone válido com DDD
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="customer-profile-email">E-mail</Label>
                    <Input
                      id="customer-profile-email"
                      value={profile?.email ?? user?.email ?? ""}
                      disabled
                      className="bg-[#F5F0E8]/60"
                    />
                    <p className="text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      O e-mail não pode ser alterado aqui. Entre em contato conosco se precisar atualizar.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="submit"
                      className="nativa-btn-primary rounded-lg"
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

          <Card className="border-[#E8D5C4] shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-[#3D2B1F]">
                <Lock className="size-5 text-[#C4522A]" />
                <h2 className="text-lg font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Segurança
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="customer-new-password">Nova senha</Label>
                  <Input
                    id="customer-new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Digite a nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={savingPassword}
                  />
                  {!!passwordHint && (
                    <p className="text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {passwordHint}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="customer-new-password-confirm">Confirmar nova senha</Label>
                  <Input
                    id="customer-new-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={savingPassword}
                  />
                  {!passwordsMatch && confirmPassword.length > 0 && (
                    <p className="text-xs text-destructive" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      As senhas não conferem
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-fit rounded-lg"
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

          <Card className="border-[#E8D5C4] shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-[#3D2B1F]">
                <Package className="size-5 text-[#C4522A]" />
                <h2 className="text-lg font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Meus pedidos
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              <Separator className="mb-4 bg-[#E8D5C4]" />
              <p className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Em breve você poderá acompanhar pedidos e entregas por aqui. Enquanto isso, fale conosco pelo
                WhatsApp se precisar de ajuda com uma compra.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function CustomerAccount() {
  return (
    <RequireCustomerAuth>
      <CustomerAccountContent />
    </RequireCustomerAuth>
  );
}
