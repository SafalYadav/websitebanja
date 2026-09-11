import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import InteractiveDemo from "@/components/landing/InteractiveDemo";
import AboutEntity from "@/components/landing/AboutEntity";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowITWorks";
import BeforeAfterComparison from "@/components/landing/BeforeAfterComparison";
import BuildChoiceSection from "@/components/landing/BuildChoiceSection";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/Footer";
import SmoothScrollProvider from "@/components/landing/SmoothScrollProvider";

import JsonLd, { faqPageJsonLd } from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <SmoothScrollProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#040406] dark:text-zinc-100 transition-colors duration-200 selection:bg-cyan-500/20 selection:text-cyan-900 dark:selection:text-cyan-200">
        <JsonLd data={faqPageJsonLd} />
        <Navbar />
        <main className="flex-1 overflow-x-clip">
          <Hero />
          <InteractiveDemo />
          <AboutEntity />
          <Features />
          <HowItWorks />
          <BeforeAfterComparison />
          <BuildChoiceSection />
          <Pricing />
          <FAQ />
          <CtaSection />
        </main>
        <Footer />
      </div>
    </SmoothScrollProvider>
  );
}