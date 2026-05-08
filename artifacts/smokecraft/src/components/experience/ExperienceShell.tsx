import { type ReactNode } from "react";
import { CinematicTransition } from "./CinematicTransition";
import { AtmosphereLayer }     from "./AtmosphereLayer";
import { EnvironmentRenderer } from "../environment/EnvironmentRenderer";

interface Props {
  craftType: string;
  children:  ReactNode;
  motionKey?: string;
}

export function ExperienceShell({ craftType, children, motionKey }: Props) {
  return (
    <div style={{
      position:   "relative",
      minHeight:  "100vh",
      overflow:   "hidden",
      background: "#0A0A0B",
    }}>
      <AtmosphereLayer craftType={craftType} />
      <EnvironmentRenderer craftType={craftType} />

      <div style={{ position: "relative", zIndex: 20 }}>
        <CinematicTransition motionKey={motionKey ?? craftType}>
          {children}
        </CinematicTransition>
      </div>
    </div>
  );
}

export default ExperienceShell;
