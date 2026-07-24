import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import { Spinner } from "@/components/ui/spinner";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  usePageMeta,
} from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_TITLE } from "@shared/const/site";
import { lazy, Suspense, type ReactNode } from "react";

/** Seções abaixo da dobra: não atrasam o LCP do banner. */
const CategoriesSection = lazy(() => import("@/components/CategoriesSection"));
const QuizCtaSection = lazy(() => import("@/components/QuizCtaSection"));
const MapaOrigens = lazy(() => import("@/components/MapaOrigens/MapaOrigens"));
const ProductsSection = lazy(() => import("@/components/ProductsSection"));
const AboutSection = lazy(() => import("@/components/AboutSection"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const PromoSection = lazy(() => import("@/components/PromoSection"));

function BelowFold({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16" aria-hidden>
          <Spinner className="size-6 text-[#C4522A]/40" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

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
      <BelowFold>
        <CategoriesSection />
        <QuizCtaSection />
        <MapaOrigens />
        <ProductsSection />
        <AboutSection />
        <TestimonialsSection />
        <PromoSection />
      </BelowFold>
      <Footer />
    </div>
  );
}
