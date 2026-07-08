import AuthFormCard from "@/components/auth/AuthFormCard";
import AuthInputField from "@/components/auth/AuthInputField";
import AuthPageShell from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { KeyRound, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function CustomerForgotPassword() {
  const { isLoading, user, resetPassword } = useCustomerAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/conta");
    }
  }, [isLoading, user, setLocation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
      toast("E-mail enviado", {
        description: "Se o endereço existir, você receberá um link para redefinir a senha.",
      });
    } catch (error) {
      toast("Erro ao enviar", {
        description: error instanceof Error ? error.message : "Tente novamente",
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
      <div className="mx-auto w-full max-w-md">
        <AuthFormCard
          icon={KeyRound}
          title="Recuperar senha"
          description="Enviaremos um link seguro para redefinir sua senha."
        >
          {sent ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Verifique a caixa de entrada de <strong>{email}</strong> (e também o spam).
              </p>
              <Link href="/entrar" className="text-sm font-semibold text-[#C4522A] hover:underline">
                Voltar para entrar
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <AuthInputField
                id="forgot-email"
                label="E-mail"
                icon={Mail}
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />

              <Button
                type="submit"
                disabled={submitting || !email.trim()}
                className="nativa-btn-primary rounded-xl py-6"
              >
                {submitting ? <Spinner className="size-4" /> : "Enviar link"}
              </Button>

              <Link href="/entrar" className="text-center text-sm font-semibold text-[#C4522A] hover:underline">
                Voltar para entrar
              </Link>
            </form>
          )}
        </AuthFormCard>
      </div>
    </AuthPageShell>
  );
}
