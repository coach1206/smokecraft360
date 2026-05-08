import { ExperienceShell }    from "@/components/experience/ExperienceShell";
import { OnboardingSequence } from "@/components/experience/OnboardingSequence";
import { RulesIntro }         from "@/components/experience/RulesIntro";

const ACCENT = "#5E9E6E";

export default function BrewCraft360() {
  return (
    <ExperienceShell craftType="brew" motionKey="brewcraft-360">
      <OnboardingSequence
        title="BrewCraft 360"
        subtitle="Every brew tells a story. Tonight, you discover yours."
        accent={ACCENT}
      />
      <RulesIntro craftTitle="BrewCraft 360" accent={ACCENT} />
    </ExperienceShell>
  );
}
