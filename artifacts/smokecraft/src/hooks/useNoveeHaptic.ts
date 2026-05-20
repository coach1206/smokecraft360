export function hapticClick() {
  try { navigator.vibrate?.(40); } catch {}
}
export function hapticMilestone() {
  try { navigator.vibrate?.([150, 50, 150]); } catch {}
}
export function hapticError() {
  try { navigator.vibrate?.(400); } catch {}
}
export function hapticPulse() {
  try { navigator.vibrate?.([100, 300, 100, 300, 100]); } catch {}
}
