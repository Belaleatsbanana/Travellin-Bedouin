import { ClipboardList, Zap, MapPin } from "lucide-react";

const steps = [
  {
    Icon: ClipboardList,
    step: "01",
    title: "Enter Your Details",
    desc: "Tell us where you're going, your travel dates, number of travelers, and total budget.",
  },
  {
    Icon: Zap,
    step: "02",
    title: "Agents Get to Work",
    desc: "Five AI agents run simultaneously — visa checks, hotel searches, transport options, and activity curation.",
  },
  {
    Icon: MapPin,
    step: "03",
    title: "Get Your Full Plan",
    desc: "Review a complete trip plan with options to compare, select, and export.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-brand-parchment px-4">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-brand-night mb-4">
          How It Works
        </h2>
        <p className="text-brand-night/60 mb-14 max-w-lg mx-auto">
          From zero to a complete trip plan in under a minute.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map(({ Icon, step, title, desc }) => (
            <div key={step} className="relative bg-white rounded-2xl p-8 shadow-sm border border-brand-sand/20 text-left">
              <span className="text-5xl font-serif font-bold text-brand-sand/20 absolute top-4 right-6">
                {step}
              </span>
              <div className="w-12 h-12 rounded-xl bg-brand-night flex items-center justify-center mb-5">
                <Icon className="w-6 h-6 text-brand-sand" />
              </div>
              <h3 className="font-serif font-semibold text-xl text-brand-night mb-2">{title}</h3>
              <p className="text-brand-night/60 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
