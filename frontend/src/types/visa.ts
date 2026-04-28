export interface VisaRequirement {
  required: boolean;
  visaType: string | null;
  processingDays: number;
  cost: number;
  currency: string;
  applicationUrl?: string;
  notes: string[];
  documentsRequired: string[];
}

export interface InsurancePackage {
  id: string;
  provider: string;
  planName: string;
  coverageType: "basic" | "standard" | "premium";
  pricePerPerson: number;
  totalPrice: number;
  currency: string;
  coverageHighlights: string[];
  medicalCoverage: number;
  cancellationCoverage: number;
  recommended: boolean;
}

export interface VisaAgentResult {
  visaRequirement: VisaRequirement;
  travelAdvisory: {
    level: "safe" | "caution" | "warning" | "restricted";
    message: string;
  };
  entryRequirements: string[];
  insurancePackages: InsurancePackage[];
}
