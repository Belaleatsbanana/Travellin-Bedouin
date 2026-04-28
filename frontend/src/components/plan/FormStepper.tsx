import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  label: string;
}

interface FormStepperProps {
  currentStep: number;
  steps: Step[];
}

export function FormStepper({ currentStep, steps }: FormStepperProps) {
  return (
    <div className="flex items-center mb-10">
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                  done && "bg-emerald-500 text-white",
                  active && "bg-brand-sand text-brand-night ring-4 ring-brand-sand/20",
                  !done && !active && "bg-white border-2 border-gray-200 text-gray-400"
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium whitespace-nowrap",
                  active ? "text-brand-dune" : "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 rounded transition-all",
                  done ? "bg-emerald-400" : "bg-gray-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
