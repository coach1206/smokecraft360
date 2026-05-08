import { ExperienceShell }    from "@/components/experience/ExperienceShell";
import { OnboardingSequence } from "@/components/experience/OnboardingSequence";
import { RulesIntro }         from "@/components/experience/RulesIntro";

const ACCENT = "#E8C870";

export default function PourCraft360() {
  return (
    <ExperienceShell craftType="pour" motionKey="pourcraft-360">
      <OnboardingSequence
        title="PourCraft 360"
        subtitle="Tonight is not about ordering a drink. It is about crafting an experience."
        accent={ACCENT}
      />
      <RulesIntro craftTitle="PourCraft 360" accent={ACCENT} />
    </ExperienceShell>
  );
}
