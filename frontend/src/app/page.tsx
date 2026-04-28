import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { AgentShowcaseSection } from "@/components/landing/AgentShowcaseSection";
import { CtaSection } from "@/components/landing/CtaSection";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <HowItWorksSection />
        <AgentShowcaseSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
