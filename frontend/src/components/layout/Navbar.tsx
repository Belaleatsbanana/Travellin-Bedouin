"use client";

import Link from "next/link";
import { Compass } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-brand-night/90 backdrop-blur border-b border-brand-sand/20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-brand-sand font-serif font-semibold text-lg">
          <Compass className="w-6 h-6" />
          Travellin Bedouin
        </Link>
        <Link
          href="/plan"
          className="px-4 py-2 rounded-lg bg-brand-sand text-brand-night font-semibold text-sm hover:bg-brand-dune transition-colors"
        >
          Plan a Trip
        </Link>
      </div>
    </nav>
  );
}
