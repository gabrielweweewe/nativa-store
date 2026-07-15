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
      {/* Navbar fixa: h-16 mobile / h-20 desktop */}
      <main className="pt-24 md:pt-28">
        <QuizCuradoria />
      </main>
      <Footer />
    </div>
  );
}
