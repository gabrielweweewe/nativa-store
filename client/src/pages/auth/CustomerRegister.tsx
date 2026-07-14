import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import AuthFormCard from "@/components/auth/AuthFormCard";
import AuthInputField from "@/components/auth/AuthInputField";
import AuthPageShell from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { formatPhoneBr, isValidPhoneBr, normalizePhoneBr } from "@shared/lib/phoneBr";
import { UserPlus, Mail, Lock, User, Phone, Heart, ShoppingBag, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { usePageMeta } from "@/lib/seo";

function getPasswordHint(password: string) {
  if (password.length < 8) return "Use pelo menos 8 caracteres";
  return "";
}

export default function CustomerRegister() {
  const { isLoading, user, signUp } = useCustomerAuth();
  const [, setLocation] = useLocation();

  usePageMeta({
    title: "Criar conta — Nativa Store",
    description: "Cadastre-se na Nativa Store e acompanhe pedidos de artesanato brasileiro.",
    path: "/cadastro",
    noIndex: true,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const returnTo =
    window.sessionStorage.getItem("nativa_auth_return_to") || "/conta";

  useEffect(() => {
    if (!isLoading && user) {
      window.sessionStorage.removeItem("nativa_auth_return_to");
      setLocation(returnTo);
    }
  }, [isLoading, user, setLocation, returnTo]);

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
      window.sessionStorage.removeItem("nativa_auth_return_to");
      setLocation(returnTo);
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
    <AuthPageShell centered={false}>
      <div className="mx-auto grid w-full max-w-5xl items-start gap-10 lg:grid-cols-[1fr_460px] lg:gap-16">
        <AuthBrandPanel
          eyebrow="Junte-se à Nativa"
          title="Crie sua conta em poucos passos"
          description="Guarde seus dados com segurança e tenha uma experiência personalizada. Endereço e CPF serão solicitados apenas no checkout."
          features={[
            { icon: Heart, text: "Salve favoritos e preferências" },
            { icon: ShoppingBag, text: "Compras mais rápidas nas próximas visitas" },
            { icon: Truck, text: "Acompanhe pedidos quando o checkout estiver ativo" },
          ]}
        />

        <AuthFormCard
          icon={UserPlus}
          title="Criar sua conta"
          description="Preencha os dados abaixo para começar."
          className="lg:sticky lg:top-32"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <AuthInputField
              id="customer-name"
              label="Nome completo"
              icon={User}
              placeholder="Seu nome"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
            />

            <AuthInputField
              id="customer-phone"
              label="Telefone (WhatsApp)"
              icon={Phone}
              placeholder="(11) 99999-9999"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
              disabled={submitting}
              error={phoneInvalid ? "Informe um telefone válido com DDD" : undefined}
            />

            <AuthInputField
              id="customer-email"
              label="E-mail"
              icon={Mail}
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />

            <AuthInputField
              id="customer-password"
              label="Senha"
              icon={Lock}
              type="password"
              autoComplete="new-password"
              placeholder="Crie uma senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              hint={passwordHint || undefined}
            />

            <AuthInputField
              id="customer-password-confirm"
              label="Confirmar senha"
              icon={Lock}
              type="password"
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              error={
                !passwordsMatch && confirmPassword.length > 0 ? "As senhas não conferem" : undefined
              }
            />

            <label
              className="flex items-start gap-3 rounded-xl border border-[#E8D5C4]/80 bg-[#FFFCF8] px-4 py-3 text-sm text-[#3D2B1F]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
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
              className="nativa-btn-primary mt-1 rounded-xl py-6 text-sm tracking-wide"
            >
              {submitting ? <Spinner className="size-4" /> : "Criar conta"}
            </Button>

            <p
              className="text-center text-sm text-[#8B6F5E]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Já tem conta?{" "}
              <Link href="/entrar" className="font-semibold text-[#C4522A] hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </AuthFormCard>
      </div>
    </AuthPageShell>
  );
}
