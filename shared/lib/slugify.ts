import { nanoid } from "nanoid";

/** Converte um texto livre em slug de URL (minúsculas, sem acentos, hífens). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Gera um slug único a partir do nome, adicionando um sufixo aleatório se já existir. */
export function slugifyUnique(text: string, isTaken: (slug: string) => boolean): string {
  const base = slugify(text) || "produto";

  if (!isTaken(base)) {
    return base;
  }

  let candidate = `${base}-${nanoid(5).toLowerCase()}`;
  while (isTaken(candidate)) {
    candidate = `${base}-${nanoid(5).toLowerCase()}`;
  }

  return candidate;
}
