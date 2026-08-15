import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import BeforeAfterComparison from "@/components/landing/BeforeAfterComparison";
import HowItWorks from "@/components/HowITWorks";
import Features from "@/components/Features";
import Templates from "@/components/Templates";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 transition-colors duration-200">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <BeforeAfterComparison />
        <HowItWorks />
        <Features />
        <Templates />
        <Pricing />
        <FAQ />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}