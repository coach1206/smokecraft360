import { ExperienceShell }    from "@/components/experience/ExperienceShell";
import { OnboardingSequence } from "@/components/experience/OnboardingSequence";
import { RulesIntro }         from "@/components/experience/RulesIntro";

const ACCENT = "#C8A96E";

export default function SmokeCraft360() {
  return (
    <ExperienceShell craftType="smoke" motionKey="smokecraft-360">
      <OnboardingSequence
        title="SmokeCraft 360"
        subtitle="Every draw is a conversation between fire, leaf, and memory."
        accent={ACCENT}
      />
      <RulesIntro craftTitle="SmokeCraft 360" accent={ACCENT} />
    </ExperienceShell>
  );
}
