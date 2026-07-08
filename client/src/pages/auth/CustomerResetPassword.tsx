import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <Navbar />
      <main className="container flex min-h-[calc(100vh-160px)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-[#E8D5C4] shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-[#3D2B1F]">
              <Lock className="size-5 text-[#C4522A]" />
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Nova senha
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Escolha uma senha segura para sua conta.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="reset-password">Nova senha</Label>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Crie uma senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
                {!!passwordHint && (
                  <p className="text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {passwordHint}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="reset-password-confirm">Confirmar senha</Label>
                <Input
                  id="reset-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                />
                {!passwordsMatch && confirmPassword.length > 0 && (
                  <p className="text-xs text-destructive" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    As senhas não conferem
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting || !password || !confirmPassword || !passwordsMatch}
                className="nativa-btn-primary mt-1 rounded-lg py-5"
              >
                {submitting ? <Spinner className="size-4" /> : "Salvar nova senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
