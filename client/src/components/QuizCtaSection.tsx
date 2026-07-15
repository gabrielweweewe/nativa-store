import { Link } from "wouter";

/** Convite ao Quiz de Curadoria — seção da home. */
export default function QuizCtaSection() {
  return (
    <section
      className="relative overflow-hidden py-16 sm:py-20"
      style={{
        background: "linear-gradient(135deg, #F8E8DC 0%, #F5F0E8 50%, #E8F0EB 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 40%, rgba(196,82,42,0.14) 0%, transparent 42%), radial-gradient(circle at 85% 60%, rgba(45,106,79,0.12) 0%, transparent 40%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <p
          className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]"
          style={{ color: "#8B6F5E", fontFamily: "'Nunito', sans-serif" }}
        >
          Quiz de Curadoria
        </p>
        <h2
          className="mb-4 text-3xl leading-tight sm:text-4xl"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "#3D2B1F",
          }}
        >
          Descubra sua bolsa ideal
        </h2>
        <p
          className="mx-auto mb-8 max-w-lg text-base leading-relaxed"
          style={{ color: "#5C4A3D", fontFamily: "'Lora', Georgia, serif" }}
        >
          Um quiz rápido de estilo para encontrar a peça que combina com a sua essência.
        </p>
        <Link
          href="/quiz"
          className="inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, #C4522A, #E8821A)",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          Começar o quiz
        </Link>
      </div>
    </section>
  );
}
