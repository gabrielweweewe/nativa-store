import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import AuthFormCard from "@/components/auth/AuthFormCard";
import AuthInputField from "@/components/auth/AuthInputField";
import AuthPageShell from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { LogIn, Mail, Lock, Package, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { usePageMeta } from "@/lib/seo";

export default function CustomerLogin() {
  const { isLoading, user, signIn } = useCustomerAuth();
  const [, setLocation] = useLocation();

  usePageMeta({
    title: "Entrar — Nativa Store",
    description: "Acesse sua conta na Nativa Store para acompanhar pedidos e comprar com mais praticidade.",
    path: "/entrar",
    noIndex: true,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const returnTo =
    window.sessionStorage.getItem("nativa_auth_return_to") || "/conta";

  useEffect(() => {
    if (!isLoading && user) {
      window.sessionStorage.removeItem("nativa_auth_return_to");
      setLocation(returnTo);
    }
  }, [isLoading, user, setLocation, returnTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      toast("Bem-vindo(a) de volta!", { description: "Login realizado com sucesso." });
      window.sessionStorage.removeItem("nativa_auth_return_to");
      setLocation(returnTo);
    } catch (error) {
      toast("Erro ao entrar", {
        description: error instanceof Error ? error.message : "Não foi possível entrar",
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
    <AuthPageShell>
      <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_420px] lg:gap-16 xl:grid-cols-[1fr_440px]">
        <AuthBrandPanel
          eyebrow="Minha conta Nativa"
          title="Liberdade em cada detalhe, também na sua conta"
          description="Acesse seu perfil, acompanhe pedidos e tenha uma experiência mais fluida nas próximas compras de artesanato brasileiro."
          features={[
            { icon: Package, text: "Histórico de pedidos em um só lugar" },
            { icon: ShieldCheck, text: "Dados protegidos com login seguro" },
            { icon: Sparkles, text: "Checkout mais rápido nas próximas visitas" },
          ]}
          footer="&ldquo;Artesanato feito à mão, com alma e cuidado em cada peça.&rdquo;"
        />

        <AuthFormCard
          icon={LogIn}
          title="Entrar na sua conta"
          description="Use o e-mail e a senha cadastrados para continuar."
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              labelExtra={
                <Link
                  href="/recuperar-senha"
                  className="text-xs font-semibold text-[#C4522A] hover:underline"
                >
                  Esqueci minha senha
                </Link>
              }
            />

            <Button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="nativa-btn-primary mt-1 rounded-xl py-6 text-sm tracking-wide"
            >
              {submitting ? <Spinner className="size-4" /> : "Entrar"}
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8D5C4]" />
              </div>
              <p
                className="relative mx-auto w-fit bg-white px-3 text-xs text-[#8B6F5E]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                Novo por aqui?
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              asChild
              className="rounded-xl border-[#C4522A]/25 py-6 text-[#C4522A] hover:bg-[#C4522A]/5"
            >
              <Link href="/cadastro">Criar minha conta</Link>
            </Button>
          </form>
        </AuthFormCard>
      </div>
    </AuthPageShell>
  );
}
