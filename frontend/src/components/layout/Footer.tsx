import { Compass } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-brand-night text-brand-sand/60 py-8 text-center text-sm">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Compass className="w-4 h-4" />
        <span className="font-serif text-brand-sand">Travellin Bedouin</span>
      </div>
      <p>AI-powered travel planning. All results are illustrative.</p>
    </footer>
  );
}
