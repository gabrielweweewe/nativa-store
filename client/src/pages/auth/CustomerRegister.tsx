import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { formatPhoneBr, isValidPhoneBr, normalizePhoneBr } from "@shared/lib/phoneBr";
import { UserPlus, Mail, Lock, User, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

function getPasswordHint(password: string) {
  if (password.length < 8) return "Use pelo menos 8 caracteres";
  return "";
}

export default function CustomerRegister() {
  const { isLoading, user, signUp } = useCustomerAuth();
  const [, setLocation] = useLocation();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/conta");
    }
  }, [isLoading, user, setLocation]);

  const passwordHint = useMemo(() => getPasswordHint(password), [password]);
  const passwordsMatch = password === confirmPassword;
  const phoneDigits = normalizePhoneBr(phone);
  const phoneInvalid = phoneDigits.length > 0 && !isValidPhoneBr(phoneDigits);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (passwordHint) {
      toast("Senha fraca", { description: passwordHint });
      return;
    }

    if (!passwordsMatch) {
      toast("Senhas não conferem", { description: "Verifique e tente novamente." });
      return;
    }

    if (phoneInvalid) {
      toast("Telefone inválido", { description: "Informe DDD + número com 10 ou 11 dígitos." });
      return;
    }

    if (!acceptedTerms) {
      toast("Aceite os termos", { description: "É necessário concordar para criar a conta." });
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp({
        fullName: fullName.trim(),
        phone: phoneDigits || undefined,
        email: email.trim(),
        password,
      });

      if (result.needsEmailConfirmation) {
        toast("Quase lá!", { description: "Confirme seu e-mail para ativar a conta." });
        setLocation(`/verificar-email?email=${encodeURIComponent(email.trim())}`);
        return;
      }

      toast("Cadastro criado!", { description: "Sua conta está pronta." });
      setLocation("/conta");
    } catch (error) {
      toast("Erro no cadastro", {
        description: error instanceof Error ? error.message : "Não foi possível criar sua conta",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">
        <Spinner className="size-8 text-[#C4522A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <Navbar />
      <main className="container flex min-h-[calc(100vh-160px)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-[#E8D5C4] shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-[#3D2B1F]">
              <UserPlus className="size-5 text-[#C4522A]" />
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Criar sua conta
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Nome e telefone agora. Endereço e CPF serão solicitados no checkout.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-name">Nome completo</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
                  <Input
                    id="customer-name"
                    className="pl-9"
                    placeholder="Seu nome"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-phone">Telefone (WhatsApp)</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
                  <Input
                    id="customer-phone"
                    className="pl-9"
                    placeholder="(11) 99999-9999"
                    autoComplete="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
                    disabled={submitting}
                  />
                </div>
                {phoneInvalid && (
                  <p className="text-xs text-destructive" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    Informe um telefone válido com DDD
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
                  <Input
                    id="customer-email"
                    type="email"
                    autoComplete="email"
                    className="pl-9"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-password">Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
                  <Input
                    id="customer-password"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    placeholder="Crie uma senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                {!!passwordHint && (
                  <p className="text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {passwordHint}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-password-confirm">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
                  <Input
                    id="customer-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                {!passwordsMatch && confirmPassword.length > 0 && (
                  <p className="text-xs text-destructive" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    As senhas não conferem
                  </p>
                )}
              </div>

              <label className="flex items-start gap-3 text-sm text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <Checkbox
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  disabled={submitting}
                  className="mt-0.5"
                />
                <span>
                  Li e concordo com o uso dos meus dados para compras e comunicação da Nativa Store.
                </span>
              </label>

              <Button
                type="submit"
                disabled={
                  submitting ||
                  !fullName.trim() ||
                  !email.trim() ||
                  !password ||
                  !confirmPassword ||
                  !passwordsMatch ||
                  phoneInvalid ||
                  !acceptedTerms
                }
                className="nativa-btn-primary mt-1 rounded-lg py-5"
              >
                {submitting ? <Spinner className="size-4" /> : "Criar conta"}
              </Button>

              <p className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Já tem conta?{" "}
                <Link href="/entrar" className="font-semibold text-[#C4522A] hover:underline">
                  Entrar
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
