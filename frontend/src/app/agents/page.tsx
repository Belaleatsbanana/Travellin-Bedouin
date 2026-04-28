import { Navbar } from "@/components/layout/Navbar";
import { AgentOrchestrator } from "@/components/agents/AgentOrchestrator";

export default function AgentsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-brand-parchment px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-serif font-bold text-brand-night mb-2">
              Your Agents Are Working
            </h1>
            <p className="text-brand-night/50">
              Five specialists are researching your trip in parallel. Watch their progress below.
            </p>
          </div>
          <AgentOrchestrator />
        </div>
      </main>
    </>
  );
}
