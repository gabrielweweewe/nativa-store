import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import QuizCuradoria from "@/components/QuizCuradoria/QuizCuradoria";
import { usePageMeta } from "@/lib/seo";
import { SITE_NAME } from "@shared/const/site";

export default function QuizPage() {
  usePageMeta({
    title: `Quiz de Curadoria — ${SITE_NAME}`,
    description:
      "Descubra sua bolsa ideal com o Quiz de Curadoria da Nativa. Responda perguntas de estilo e receba recomendações personalizadas.",
    path: "/quiz",
  });

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <Navbar />
      <main>
        <header className="px-4 pb-2 pt-10 text-center sm:pt-14">
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: "#8B6F5E", fontFamily: "'Nunito', sans-serif" }}
          >
            Curadoria Nativa
          </p>
          <h1
            className="text-3xl sm:text-4xl"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "#3D2B1F",
            }}
          >
            Descubra sua bolsa ideal
          </h1>
          <p
            className="mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base"
            style={{ color: "#5C4A3D", fontFamily: "'Lora', Georgia, serif" }}
          >
            Responda com o coração — a gente recomenda peças com a sua vibe.
          </p>
        </header>
        <QuizCuradoria />
      </main>
      <Footer />
    </div>
  );
}
