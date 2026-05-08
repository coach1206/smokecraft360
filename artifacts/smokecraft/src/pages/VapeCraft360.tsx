import { ExperienceShell }    from "@/components/experience/ExperienceShell";
import { OnboardingSequence } from "@/components/experience/OnboardingSequence";
import { RulesIntro }         from "@/components/experience/RulesIntro";

const ACCENT = "#9B8EC4";

export default function VapeCraft360() {
  return (
    <ExperienceShell craftType="vape" motionKey="vapecraft-360">
      <OnboardingSequence
        title="VapeCraft 360"
        subtitle="Flavor becomes atmosphere. Atmosphere becomes experience."
        accent={ACCENT}
      />
      <RulesIntro craftTitle="VapeCraft 360" accent={ACCENT} />
    </ExperienceShell>
  );
}
