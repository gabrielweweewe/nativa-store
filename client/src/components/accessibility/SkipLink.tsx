/**
 * Link de pular para o conteúdo — WCAG 2.4.1 (Bypass Blocks).
 * Visível apenas no foco do teclado.
 */
export default function SkipLink() {
  return (
    <a href="#conteudo" className="nativa-skip-link">
      Pular para o conteúdo
    </a>
  );
}
