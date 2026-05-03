/**
 * /demo — gated entry point to the SmokeCraft 360 demo.
 *
 * Mounts <DemoNdaModal/> until the NDA is signed (sessionStorage flag),
 * then redirects to /intro to trigger the normal boot/demo experience.
 * Reload-resistant: signed flag is checked synchronously on first render.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { DemoNdaModal, hasSignedDemoNda } from "@/components/Demo/DemoNdaModal";

export default function Demo() {
  const [, navigate] = useLocation();
  const [signed, setSigned] = useState<boolean>(() => hasSignedDemoNda());

  if (signed) {
    // Defer navigation to next tick so React doesn't navigate during render.
    queueMicrotask(() => navigate("/intro"));
    return null;
  }
  return <DemoNdaModal onComplete={() => { setSigned(true); navigate("/intro"); }} />;
}
