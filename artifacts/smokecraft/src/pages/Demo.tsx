/**
 * /demo — gated entry point to the SmokeCraft 360 demo.
 *
 * Mounts <DemoNdaModal/> until the NDA is signed (sessionStorage flag),
 * then redirects to /experience-center. Reload-resistant: signed flag is
 * checked synchronously on first render. Kiosk inactivity is paused while
 * the NDA modal is active.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DemoNdaModal, hasSignedDemoNda } from "@/components/Demo/DemoNdaModal";
import { useKioskMode } from "@/contexts/KioskModeContext";

export default function Demo() {
  const [, navigate] = useLocation();
  const [signed, setSigned] = useState<boolean>(() => hasSignedDemoNda());
  const { setNdaActive, deviceId, venueId } = useKioskMode();

  useEffect(() => {
    if (!signed) {
      setNdaActive(true);
      return () => { setNdaActive(false); };
    }
    return undefined;
  }, [signed, setNdaActive]);

  if (signed) {
    queueMicrotask(() => navigate("/experience-center"));
    return null;
  }

  return (
    <DemoNdaModal
      deviceId={deviceId}
      venueId={venueId}
      onComplete={() => {
        setSigned(true);
        setNdaActive(false);
        navigate("/experience-center");
      }}
    />
  );
}
