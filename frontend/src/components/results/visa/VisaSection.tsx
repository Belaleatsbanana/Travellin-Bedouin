"use client";

import type { VisaAgentResult } from "@/types/visa";
import { SectionHeader } from "../shared/SectionHeader";
import { Shield, AlertTriangle, CheckCircle, XCircle, FileText, Star } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const advisoryColors = {
  safe: "bg-emerald-50 border-emerald-200 text-emerald-700",
  caution: "bg-yellow-50 border-yellow-200 text-yellow-700",
  warning: "bg-orange-50 border-orange-200 text-orange-700",
  restricted: "bg-red-50 border-red-200 text-red-700",
};

const coverageBg = {
  basic: "bg-gray-50 border-gray-200",
  standard: "bg-blue-50 border-blue-200",
  premium: "bg-purple-50 border-purple-200",
};

interface Props {
  result: VisaAgentResult;
}

export function VisaSection({ result }: Props) {
  const { visaRequirement, travelAdvisory, entryRequirements, insurancePackages } = result;

  return (
    <section id="visa" className="space-y-6">
      <SectionHeader Icon={Shield} title="Visa & Insurance" subtitle="Requirements and recommended coverage" />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-brand-sand/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-brand-night/60" />
            <h3 className="font-semibold text-brand-night">Visa Requirement</h3>
          </div>
          <div className="flex items-center gap-2 mb-3">
            {visaRequirement.required ? (
              <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
                Visa Required
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                Visa-Free Entry
              </span>
            )}
            {visaRequirement.visaType && (
              <span className="text-sm text-brand-night/60">{visaRequirement.visaType}</span>
            )}
          </div>
          {visaRequirement.required && (
            <div className="space-y-1.5 text-sm text-brand-night/70 mb-4">
              <p>Processing time: <strong>{visaRequirement.processingDays} business days</strong></p>
              <p>Fee: <strong>{formatCurrency(visaRequirement.cost, visaRequirement.currency)}</strong></p>
              {visaRequirement.applicationUrl && (
                <a href={visaRequirement.applicationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                  Official application portal ↗
                </a>
              )}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-brand-night/50 uppercase tracking-wide mb-2">Documents Required</p>
            <ul className="space-y-1">
              {visaRequirement.documentsRequired.map((doc) => (
                <li key={doc} className="flex items-start gap-2 text-xs text-brand-night/70">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  {doc}
                </li>
              ))}
            </ul>
          </div>
          {visaRequirement.notes.length > 0 && (
            <div className="mt-4 space-y-1">
              {visaRequirement.notes.map((note) => (
                <div key={note} className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {note}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className={cn("rounded-2xl border p-4 text-sm font-medium", advisoryColors[travelAdvisory.level])}>
            <p className="font-semibold capitalize mb-1">Travel Advisory: {travelAdvisory.level}</p>
            <p className="font-normal opacity-80">{travelAdvisory.message}</p>
          </div>

          <div className="bg-white rounded-2xl border border-brand-sand/20 p-4">
            <p className="text-xs font-semibold text-brand-night/50 uppercase tracking-wide mb-2">Entry Requirements</p>
            <ul className="space-y-1.5">
              {entryRequirements.map((req) => (
                <li key={req} className="flex items-start gap-2 text-xs text-brand-night/70">
                  <CheckCircle className="w-3.5 h-3.5 text-brand-sand shrink-0 mt-0.5" />
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-serif font-semibold text-brand-night mb-4">Insurance Packages</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {insurancePackages.map((pkg) => (
            <div
              key={pkg.id}
              className={cn("rounded-2xl border p-5 relative", coverageBg[pkg.coverageType])}
            >
              {pkg.recommended && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-sand text-brand-night text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> Recommended
                </div>
              )}
              <p className="text-xs text-brand-night/50 font-medium uppercase tracking-wide mb-1">{pkg.provider}</p>
              <p className="font-semibold text-brand-night mb-1">{pkg.planName}</p>
              <p className="text-xl font-bold text-brand-dune mb-3">
                {formatCurrency(pkg.totalPrice, pkg.currency)}
                <span className="text-xs font-normal text-brand-night/50 ml-1">/person</span>
              </p>
              <ul className="space-y-1.5">
                {pkg.coverageHighlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-xs text-brand-night/70">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
