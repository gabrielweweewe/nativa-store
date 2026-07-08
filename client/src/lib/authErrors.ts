const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos. Verifique os dados e tente novamente.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
  "User already registered": "Este e-mail já possui cadastro. Tente entrar ou recuperar a senha.",
  "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
  "Signup requires a valid password": "Informe uma senha válida.",
  "Unable to validate email address: invalid format": "Informe um e-mail válido.",
  "For security purposes, you can only request this once every 60 seconds":
    "Aguarde um minuto antes de solicitar novamente.",
};

export function mapAuthError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Ocorreu um erro inesperado. Tente novamente.";
  }

  return AUTH_ERROR_MESSAGES[error.message] ?? error.message;
}
