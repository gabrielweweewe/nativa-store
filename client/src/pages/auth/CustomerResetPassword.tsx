import AuthFormCard from "@/components/auth/AuthFormCard";
import AuthInputField from "@/components/auth/AuthInputField";
import AuthPageShell from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { clearAuthHash, parseAuthHashError } from "@/lib/appUrl";
import { AlertCircle, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

function getPasswordHint(password: string) {
  if (password.length < 8) return "Use pelo menos 8 caracteres";
  return "";
}

export default function CustomerResetPassword() {
  const { isLoading, session, updatePassword } = useCustomerAuth();
  const [, setLocation] = useLocation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [waitingForRecovery, setWaitingForRecovery] = useState(true);

  useEffect(() => {
    const hashError = parseAuthHashError();
    if (hashError) {
      setLinkError(hashError);
      clearAuthHash();
      setWaitingForRecovery(false);
      return;
    }

    // O Supabase processa o hash do e-mail de forma assíncrona (detectSessionInUrl).
    const timer = window.setTimeout(() => {
      setWaitingForRecovery(false);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (linkError) return;
    if (session) {
      setWaitingForRecovery(false);
      clearAuthHash();
    }
  }, [session, linkError]);

  useEffect(() => {
    if (isLoading || waitingForRecovery || linkError) return;
    if (!session) {
      setLocation("/recuperar-senha");
    }
  }, [isLoading, waitingForRecovery, linkError, session, setLocation]);

  const passwordHint = useMemo(() => getPasswordHint(password), [password]);
  const passwordsMatch = password === confirmPassword;

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

    setSubmitting(true);
    try {
      await updatePassword(password);
      toast("Senha atualizada!", { description: "Sua nova senha já está ativa." });
      setLocation("/conta");
    } catch (error) {
      toast("Erro ao redefinir", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || waitingForRecovery) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F5F0E8]">
        <Spinner className="size-8 text-[#C4522A]" />
        <p className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Validando link de recuperação…
        </p>
      </div>
    );
  }

  if (linkError) {
    return (
      <AuthPageShell>
        <div className="mx-auto w-full max-w-md">
          <AuthFormCard
            icon={AlertCircle}
            title="Link inválido ou expirado"
            description={linkError}
          >
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Links de recuperação duram cerca de 1 hora e só podem ser usados uma vez. Solicite um
                novo e-mail a partir do site em produção.
              </p>
              <Button asChild className="nativa-btn-primary rounded-xl py-6">
                <Link href="/recuperar-senha">Solicitar novo link</Link>
              </Button>
              <Link href="/entrar" className="text-center text-sm font-semibold text-[#C4522A] hover:underline">
                Voltar para entrar
              </Link>
            </div>
          </AuthFormCard>
        </div>
      </AuthPageShell>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AuthPageShell>
      <div className="mx-auto w-full max-w-md">
        <AuthFormCard
          icon={Lock}
          title="Nova senha"
          description="Escolha uma senha segura para proteger sua conta."
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <AuthInputField
              id="reset-password"
              label="Nova senha"
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
              id="reset-password-confirm"
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

            <Button
              type="submit"
              disabled={submitting || !password || !confirmPassword || !passwordsMatch}
              className="nativa-btn-primary rounded-xl py-6"
            >
              {submitting ? <Spinner className="size-4" /> : "Salvar nova senha"}
            </Button>
          </form>
        </AuthFormCard>
      </div>
    </AuthPageShell>
  );
}
