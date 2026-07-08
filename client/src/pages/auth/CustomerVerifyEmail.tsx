import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useSearch } from "wouter";

export default function CustomerVerifyEmail() {
  const { isLoading, user, resendSignupConfirmation } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const email = params.get("email") ?? "";

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/conta");
    }
  }, [isLoading, user, setLocation]);

  async function handleResend() {
    if (!email) {
      toast("E-mail não informado", { description: "Volte ao cadastro e tente novamente." });
      return;
    }

    setSubmitting(true);
    try {
      await resendSignupConfirmation(email);
      toast("E-mail reenviado", { description: "Verifique sua caixa de entrada." });
    } catch (error) {
      toast("Erro ao reenviar", {
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
              <MailCheck className="size-5 text-[#C4522A]" />
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Confirme seu e-mail
              </h1>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Enviamos um link de confirmação para{" "}
              {email ? (
                <strong>{email}</strong>
              ) : (
                "seu e-mail"
              )}
              . Clique no link para ativar sua conta.
            </p>
            <p className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Não recebeu? Verifique o spam ou reenvie o e-mail abaixo.
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={submitting || !email}
              className="rounded-lg"
            >
              {submitting ? <Spinner className="size-4" /> : "Reenviar confirmação"}
            </Button>

            <Link href="/entrar" className="text-sm font-semibold text-[#C4522A] hover:underline">
              Já confirmei — entrar na conta
            </Link>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
