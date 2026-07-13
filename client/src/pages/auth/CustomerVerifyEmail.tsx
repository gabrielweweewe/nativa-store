import AuthFormCard from "@/components/auth/AuthFormCard";
import AuthPageShell from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
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
  const returnTo =
    window.sessionStorage.getItem("nativa_auth_return_to") || "/conta";

  useEffect(() => {
    if (!isLoading && user) {
      window.sessionStorage.removeItem("nativa_auth_return_to");
      setLocation(returnTo);
    }
  }, [isLoading, user, setLocation, returnTo]);

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
    <AuthPageShell>
      <div className="mx-auto w-full max-w-md">
        <AuthFormCard
          icon={MailCheck}
          title="Confirme seu e-mail"
          description="Estamos quase lá — falta só um clique para ativar sua conta."
        >
          <div className="flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Enviamos um link de confirmação para{" "}
              {email ? <strong>{email}</strong> : "seu e-mail"}. Clique no link para ativar sua conta.
            </p>
            <p className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Não recebeu? Verifique o spam ou reenvie o e-mail abaixo.
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={submitting || !email}
              className="rounded-xl border-[#C4522A]/30 py-6 text-[#C4522A] hover:bg-[#C4522A]/5"
            >
              {submitting ? <Spinner className="size-4" /> : "Reenviar confirmação"}
            </Button>

            <Link href="/entrar" className="text-center text-sm font-semibold text-[#C4522A] hover:underline">
              Já confirmei — entrar na conta
            </Link>
          </div>
        </AuthFormCard>
      </div>
    </AuthPageShell>
  );
}
