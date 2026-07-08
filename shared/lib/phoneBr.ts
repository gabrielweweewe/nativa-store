export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Máscara brasileira: (11) 99999-9999 ou (11) 9999-9999 */
export function formatPhoneBr(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhoneBr(value: string): boolean {
  const digits = digitsOnly(value);
  return digits.length === 10 || digits.length === 11;
}

/** Armazena só dígitos (10 ou 11) para o banco */
export function normalizePhoneBr(value: string): string {
  return digitsOnly(value).slice(0, 11);
}

/** Exibe telefone salvo como dígitos no formato legível */
export function displayPhoneBr(value: string | null | undefined): string {
  if (!value) return "";
  return formatPhoneBr(value);
}
