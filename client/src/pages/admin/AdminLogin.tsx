import NativaLogo from "@/components/NativaLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminApiError } from "@/lib/adminApi";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const { isAuthenticated, isLoading, login } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/admin/produtos");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(password);
      setLocation("/admin/produtos");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Não foi possível entrar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#F5F0E8] px-4"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <Card className="w-full max-w-sm border-[#E8D5C4] shadow-lg">
        <CardHeader className="flex flex-col items-center gap-3 pb-2 text-center">
          <NativaLogo className="h-12 w-auto" />
          <div>
            <h1
              className="text-xl font-bold text-[#3D2B1F]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Painel Administrativo
            </h1>
            <p className="mt-1 text-sm text-[#8B6F5E]">Acesso restrito ao dono da loja</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-password">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
                <Input
                  id="admin-password"
                  type="password"
                  autoFocus
                  className="pl-9"
                  placeholder="Digite a senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              disabled={submitting || !password}
              className="nativa-btn-primary mt-1 rounded-lg py-5"
            >
              {submitting ? <Spinner className="size-4" /> : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
