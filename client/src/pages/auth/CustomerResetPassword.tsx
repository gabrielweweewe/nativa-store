import AuthFormCard from "@/components/auth/AuthFormCard";
import AuthInputField from "@/components/auth/AuthInputField";
import AuthPageShell from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

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

  useEffect(() => {
    if (!isLoading && !session) {
      setLocation("/recuperar-senha");
    }
  }, [isLoading, session, setLocation]);

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

  if (isLoading || !session) {
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
