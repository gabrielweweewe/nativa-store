import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import QuizCtaSection from "@/components/QuizCtaSection";
import MapaOrigens from "@/components/MapaOrigens/MapaOrigens";
import ProductsSection from "@/components/ProductsSection";
import AboutSection from "@/components/AboutSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PromoSection from "@/components/PromoSection";
import Footer from "@/components/Footer";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  usePageMeta,
} from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_TITLE } from "@shared/const/site";

export default function Home() {
  usePageMeta({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
    keywords: SITE_KEYWORDS,
    type: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [buildOrganizationJsonLd(), buildWebSiteJsonLd()],
    },
  });

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <Navbar />
      <HeroSection />
      <CategoriesSection />
      <QuizCtaSection />
      <MapaOrigens />
      <ProductsSection />
      <AboutSection />
      <TestimonialsSection />
      <PromoSection />
      <Footer />
    </div>
  );
}
