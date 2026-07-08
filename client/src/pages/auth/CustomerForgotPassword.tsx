import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <Navbar />
      <main className="container flex min-h-[calc(100vh-160px)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-[#E8D5C4] shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-[#3D2B1F]">
              <KeyRound className="size-5 text-[#C4522A]" />
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Recuperar senha
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Enviaremos um link para redefinir sua senha.
            </p>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  Verifique a caixa de entrada de <strong>{email}</strong> (e também o spam).
                </p>
                <Link href="/entrar" className="text-sm font-semibold text-[#C4522A] hover:underline">
                  Voltar para entrar
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="forgot-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
                    <Input
                      id="forgot-email"
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

                <Button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="nativa-btn-primary mt-1 rounded-lg py-5"
                >
                  {submitting ? <Spinner className="size-4" /> : "Enviar link"}
                </Button>

                <Link href="/entrar" className="text-sm font-semibold text-[#C4522A] hover:underline">
                  Voltar para entrar
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
