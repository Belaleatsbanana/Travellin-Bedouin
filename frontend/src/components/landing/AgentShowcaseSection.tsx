import { Shield, DollarSign, Building2, Car, Sparkles } from "lucide-react";

const agents = [
  {
    Icon: DollarSign,
    name: "Budget Agent",
    color: "bg-yellow-50 border-yellow-200",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    desc: "Analyzes your destination's cost-of-living and intelligently distributes your budget across all travel categories.",
    tags: ["Budget allocation", "Cost analysis", "Contingency planning"],
  },
  {
    Icon: Shield,
    name: "Visa & Insurance",
    color: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    desc: "Checks visa requirements for your passport, verifies travel advisories, and recommends insurance packages.",
    tags: ["Visa requirements", "Travel advisory", "Insurance plans"],
  },
  {
    Icon: Building2,
    name: "Accommodation Agent",
    color: "bg-purple-50 border-purple-200",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    desc: "Searches hotels, apartments, chalets, and villas within your allocated budget, ranked by rating and value.",
    tags: ["Hotels", "Apartments", "Chalets & Villas"],
  },
  {
    Icon: Car,
    name: "Transportation Agent",
    color: "bg-orange-50 border-orange-200",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    desc: "Compares rental cars, dedicated drivers, metro passes, rideshare estimates, and minibus options.",
    tags: ["Car rental", "Metro passes", "Private drivers"],
  },
  {
    Icon: Sparkles,
    name: "Activities Agent",
    color: "bg-emerald-50 border-emerald-200",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    desc: "Curates experiences matching your interests and builds a day-by-day itinerary within your activity budget.",
    tags: ["Tours & experiences", "Day itinerary", "Free attractions"],
  },
];

export function AgentShowcaseSection() {
  return (
    <section className="py-24 bg-white px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-brand-night mb-4">
            Meet Your AI Travel Team
          </h2>
          <p className="text-brand-night/60 max-w-lg mx-auto">
            Each agent is a specialist. They run in parallel, then combine their findings into one unified plan.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map(({ Icon, name, color, iconBg, iconColor, desc, tags }) => (
            <div key={name} className={`rounded-2xl border p-6 ${color}`}>
              <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <h3 className="font-serif font-semibold text-brand-night text-lg mb-2">{name}</h3>
              <p className="text-brand-night/60 text-sm leading-relaxed mb-4">{desc}</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/70 text-brand-night/70 border border-current/10">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
