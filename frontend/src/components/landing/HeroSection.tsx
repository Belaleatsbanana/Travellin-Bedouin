import Link from "next/link";
import { ArrowRight, Bot, DollarSign, Building2, Car, Sparkles } from "lucide-react";

const agentIcons = [
  { Icon: DollarSign, label: "Budget", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { Icon: Bot, label: "Visa", color: "text-blue-400", bg: "bg-blue-400/10" },
  { Icon: Building2, label: "Stay", color: "text-purple-400", bg: "bg-purple-400/10" },
  { Icon: Car, label: "Transport", color: "text-orange-400", bg: "bg-orange-400/10" },
  { Icon: Sparkles, label: "Activities", color: "text-emerald-400", bg: "bg-emerald-400/10" },
];

export function HeroSection() {
  return (
    <section className="min-h-[90vh] bg-brand-night flex flex-col items-center justify-center text-center px-4 py-20">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-sand/30 text-brand-sand text-xs font-medium mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-oasis animate-pulse" />
        5 AI Agents Working in Parallel
      </div>

      <h1 className="text-4xl md:text-6xl font-serif font-bold text-white max-w-3xl leading-tight mb-6">
        Your Entire Trip,{" "}
        <span className="text-brand-sand">Planned by AI</span> in Minutes
      </h1>

      <p className="text-brand-sand/70 text-lg max-w-xl mb-10">
        Enter your destination and budget. Five specialized agents handle visa requirements,
        accommodation, transport, activities, and budget — all at once.
      </p>

      <div className="flex items-center gap-3 mb-12">
        {agentIcons.map(({ Icon, label, color, bg }) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-1 w-14 h-14 rounded-xl ${bg} border border-white/10 justify-center`}
          >
            <Icon className={`w-5 h-5 ${color}`} />
            <span className="text-[9px] text-white/50">{label}</span>
          </div>
        ))}
      </div>

      <Link
        href="/plan"
        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-sand text-brand-night font-bold text-lg hover:bg-brand-dune transition-all hover:scale-105 shadow-lg shadow-brand-sand/20"
      >
        Plan My Trip <ArrowRight className="w-5 h-5" />
      </Link>

      <p className="text-brand-sand/40 text-xs mt-6">No signup required · Works with any destination</p>
    </section>
  );
}
