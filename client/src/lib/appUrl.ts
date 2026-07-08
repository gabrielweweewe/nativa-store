/**
 * URL pública do site (sem barra final).
 * Em produção, defina VITE_APP_URL no Vercel para bater com o domínio real.
 */
export function getAppUrl(): string {
  const fromEnv = import.meta.env.VITE_APP_URL as string | undefined;
  if (fromEnv?.trim()) {
    return fromEnv.trim().replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function appPath(path: string): string {
  return `${getAppUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Erros que o Supabase devolve no hash após clique em link de e-mail */
export function parseAuthHashError(): string | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const error = params.get("error_description") ?? params.get("error");
  if (!error) return null;

  const decoded = decodeURIComponent(error.replace(/\+/g, " "));

  if (decoded.toLowerCase().includes("expired") || decoded.toLowerCase().includes("invalid")) {
    return "Este link expirou ou já foi usado. Solicite um novo e-mail de recuperação.";
  }

  if (decoded.toLowerCase().includes("access_denied")) {
    return "Não foi possível validar o link. Verifique as configurações de URL no Supabase e tente novamente.";
  }

  return decoded;
}

export function clearAuthHash(): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}
