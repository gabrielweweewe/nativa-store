import AuthFloatingLeaves from "@/components/auth/AuthFloatingLeaves";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import type { ReactNode } from "react";

interface AuthPageShellProps {
  children: ReactNode;
  /** Centraliza verticalmente (login). Desligue em formulários longos (cadastro). */
  centered?: boolean;
}

export default function AuthPageShell({ children, centered = true }: AuthPageShellProps) {
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[#F5F0E8] nativa-texture">
      <AuthFloatingLeaves />

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-20 top-0 h-80 w-80 rounded-full bg-[#C4522A]/10 blur-3xl" />
        <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#2D6A4F]/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-[#E8821A]/8 blur-3xl" />
      </div>

      <Navbar />

      <div className="relative z-10">
        <main
          className={`container px-4 pt-28 md:pt-32 pb-16 md:pb-24 ${
            centered
              ? "flex min-h-[calc(100vh-5rem)] flex-col justify-center"
              : "py-10 md:py-14"
          }`}
        >
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
