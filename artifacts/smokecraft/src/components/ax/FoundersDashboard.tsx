import { useAxiomStore } from "@/store/axiomStore";

export const FoundersDashboard = () => {
  const { totalLift, xp, occupancy } = useAxiomStore();

  return (
    <div className="p-8 bg-black/90 border border-axiom-amber/20 rounded-2xl">
      <h2 className="text-axiom-amber font-black italic text-2xl mb-6">FOUNDER'S COMMAND</h2>

      <div className="grid grid-cols-3 gap-8">
        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
          <p className="text-[10px] uppercase opacity-50">Revenue Recovery</p>
          <p className="text-3xl font-mono text-green-400">+${totalLift.toFixed(2)}</p>
        </div>

        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
          <p className="text-[10px] uppercase opacity-50">Active Prestige</p>
          <p className="text-3xl font-mono text-axiom-amber">{xp} XP</p>
        </div>

        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
          <p className="text-[10px] uppercase opacity-50">Lounge Load</p>
          <p className="text-3xl font-mono text-[#1A1A1B]">{occupancy}%</p>
        </div>
      </div>
    </div>
  );
};
