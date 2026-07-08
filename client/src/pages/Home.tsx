/**
 * Nativa Store — Home Page
 * Design: Brasil Vivo — Artesanato com Alma
 * Assembles all sections into the complete storefront
 */

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import ProductsSection from "@/components/ProductsSection";
import AboutSection from "@/components/AboutSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PromoSection from "@/components/PromoSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <Navbar />
      <HeroSection />
      <CategoriesSection />
      <ProductsSection />
      <AboutSection />
      <TestimonialsSection />
      <PromoSection />
      <Footer />
    </div>
  );
}
