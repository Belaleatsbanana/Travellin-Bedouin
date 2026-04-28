import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-24 bg-brand-night text-center px-4">
      <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">
        Ready to Plan Your Next Adventure?
      </h2>
      <p className="text-brand-sand/70 max-w-md mx-auto mb-10">
        Enter your destination and budget. Your AI team will handle everything else.
      </p>
      <Link
        href="/plan"
        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-sand text-brand-night font-bold text-lg hover:bg-brand-dune transition-all hover:scale-105"
      >
        Start Planning Free <ArrowRight className="w-5 h-5" />
      </Link>
    </section>
  );
}
