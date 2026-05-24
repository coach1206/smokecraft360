import { createElement } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * EnvironmentalSceneEngine — cinematic location-based scene system.
 *
 * Defines the living spatial identity for each section of the platform.
 * Each scene is a full sensory environment: background imagery, lighting
 * character, smoke behaviour, material language, and transition type.
 *
 * Usage:
 *   import { getScene, SCENES } from '@/lib/EnvironmentalSceneEngine';
 *   const scene = getScene('cigar-lounge');
 */

export type SceneId =
  | 'craft-hub'
  | 'cigar-lounge'
  | 'pairing-room'
  | 'control-chamber'
  | 'founder-suite'
  | 'humidor-room'
  | 'tasting-room'
  | 'executive-lounge'
  | 'splash';

export type TransitionType = 'smoke-fade' | 'light-bloom' | 'depth-shift' | 'ember-cross';
export type SmokeIntensity = 'none' | 'whisper' | 'drift' | 'thick';
export type MaterialLanguage = 'walnut' | 'leather' | 'brass' | 'velvet' | 'obsidian' | 'crystal';

export interface EnvironmentalScene {
  id: SceneId;
  /** Prose description of the space — used for accessibility and AI context */
  identity: string;
  /** Relative image path (from /images/) */
  bgImage: string;
  /** Fallback CSS gradient if image fails to load */
  bgFallback: string;
  /** 0–1: how dark the overlay is (0 = transparent, 1 = fully opaque) */
  overlayDepth: number;
  /** CSS colour of the ambient bloom at screen centre */
  bloomColour: string;
  /** Bloom opacity 0–1 */
  bloomOpacity: number;
  /** Smoke particle behaviour */
  smokeIntensity: SmokeIntensity;
  /** Smoke tint colour */
  smokeTint: string;
  /** Primary material feel of the space */
  material: MaterialLanguage;
  /** Gold / accent glow colour */
  accentGlow: string;
  /** Transition to use when entering this scene */
  entryTransition: TransitionType;
  /** Vignette strength 0–1 */
  vignetteStrength: number;
  /** CSS object-position value for the photographic layer */
  focalPoint: string;
}

const LOUNGE_BG_FALLBACK =
  'linear-gradient(160deg, #1a1208 0%, #0d0a05 40%, #120e06 70%, #0a0806 100%)';

export const SCENES: Record<SceneId, EnvironmentalScene> = {
  splash: {
    id: 'splash',
    identity: 'Private sanctuary entry — warm amber light filters through a haze of cedar and leather.',
    bgImage: 'lounge-bg.jpg',
    bgFallback: LOUNGE_BG_FALLBACK,
    overlayDepth: 0.68,
    bloomColour: 'rgba(212,175,55,0.22)',
    bloomOpacity: 0.9,
    smokeIntensity: 'drift',
    smokeTint: 'rgba(240,210,150,0.06)',
    material: 'walnut',
    accentGlow: '#D4AF37',
    entryTransition: 'smoke-fade',
    vignetteStrength: 0.85,
    focalPoint: 'center 36%',
  },
  'craft-hub': {
    id: 'craft-hub',
    identity: 'Private members club — polished walnut walls, low brass lighting, leather club chairs.',
    bgImage: 'lounge-bg.jpg',
    bgFallback: LOUNGE_BG_FALLBACK,
    overlayDepth: 0.62,
    bloomColour: 'rgba(200,160,60,0.18)',
    bloomOpacity: 0.8,
    smokeIntensity: 'whisper',
    smokeTint: 'rgba(220,190,120,0.04)',
    material: 'walnut',
    accentGlow: '#D4AF37',
    entryTransition: 'depth-shift',
    vignetteStrength: 0.75,
    focalPoint: 'center 34%',
  },
  'cigar-lounge': {
    id: 'cigar-lounge',
    identity: 'Luxury cigar ritual — heavy smoke, ember glow, humidor cedar, velvet armchairs.',
    bgImage: 'cigar_hero.jpg',
    bgFallback:
      'linear-gradient(160deg, #140c04 0%, #0e0804 40%, #1a0e06 70%, #0a0603 100%)',
    overlayDepth: 0.60,
    bloomColour: 'rgba(180,100,30,0.28)',
    bloomOpacity: 1,
    smokeIntensity: 'thick',
    smokeTint: 'rgba(200,160,100,0.08)',
    material: 'leather',
    accentGlow: '#C8821E',
    entryTransition: 'smoke-fade',
    vignetteStrength: 0.90,
    focalPoint: 'center 42%',
  },
  'pairing-room': {
    id: 'pairing-room',
    identity: 'Sommelier tasting room — crystal decanters, white-linen service, candlelit reverence.',
    bgImage: 'craft/wine-1.png',
    bgFallback:
      'linear-gradient(160deg, #120810 0%, #0e0510 40%, #180c18 70%, #0a0508 100%)',
    overlayDepth: 0.65,
    bloomColour: 'rgba(160,60,100,0.22)',
    bloomOpacity: 0.85,
    smokeIntensity: 'whisper',
    smokeTint: 'rgba(180,140,160,0.04)',
    material: 'velvet',
    accentGlow: '#B06080',
    entryTransition: 'light-bloom',
    vignetteStrength: 0.80,
    focalPoint: 'center 42%',
  },
  'control-chamber': {
    id: 'control-chamber',
    identity: 'Executive operations suite — brushed steel, recessed amber lighting, command authority.',
    bgImage: 'lounge-bg.jpg',
    bgFallback:
      'linear-gradient(160deg, #0a0a0a 0%, #111111 40%, #0d0d0d 70%, #080808 100%)',
    overlayDepth: 0.74,
    bloomColour: 'rgba(180,140,40,0.16)',
    bloomOpacity: 0.7,
    smokeIntensity: 'none',
    smokeTint: 'transparent',
    material: 'obsidian',
    accentGlow: '#C8A030',
    entryTransition: 'depth-shift',
    vignetteStrength: 0.70,
    focalPoint: 'center 35%',
  },
  'founder-suite': {
    id: 'founder-suite',
    identity: 'Founders private room — singular prestige, original art, first pour always reserved.',
    bgImage: 'lounge-bg.jpg',
    bgFallback: LOUNGE_BG_FALLBACK,
    overlayDepth: 0.76,
    bloomColour: 'rgba(212,175,55,0.30)',
    bloomOpacity: 1,
    smokeIntensity: 'drift',
    smokeTint: 'rgba(212,175,55,0.05)',
    material: 'brass',
    accentGlow: '#E8C84A',
    entryTransition: 'ember-cross',
    vignetteStrength: 0.90,
    focalPoint: 'center 38%',
  },
  'humidor-room': {
    id: 'humidor-room',
    identity: 'Spanish cedar humidor vault — precision humidity, estate leaf reserves, cedar breath.',
    bgImage: 'cedar_box.png',
    bgFallback:
      'linear-gradient(160deg, #1a0e04 0%, #120a03 40%, #1e1206 70%, #0e0902 100%)',
    overlayDepth: 0.58,
    bloomColour: 'rgba(140,90,30,0.24)',
    bloomOpacity: 0.9,
    smokeIntensity: 'whisper',
    smokeTint: 'rgba(180,130,80,0.05)',
    material: 'walnut',
    accentGlow: '#A06820',
    entryTransition: 'smoke-fade',
    vignetteStrength: 0.85,
    focalPoint: 'center 44%',
  },
  'tasting-room': {
    id: 'tasting-room',
    identity: 'Spirit tasting chamber — cut crystal, amber decanters, low practical lighting.',
    bgImage: 'pour/pour_tasting.png',
    bgFallback:
      'linear-gradient(160deg, #140e04 0%, #100c06 40%, #181008 70%, #0c0804 100%)',
    overlayDepth: 0.62,
    bloomColour: 'rgba(200,130,40,0.22)',
    bloomOpacity: 0.85,
    smokeIntensity: 'whisper',
    smokeTint: 'rgba(200,160,100,0.04)',
    material: 'crystal',
    accentGlow: '#D4914A',
    entryTransition: 'light-bloom',
    vignetteStrength: 0.80,
    focalPoint: 'center 44%',
  },
  'executive-lounge': {
    id: 'executive-lounge',
    identity: 'Private hospitality academy — measured ceremony, institutional knowledge, first principles.',
    bgImage: 'lounge-bg.jpg',
    bgFallback: LOUNGE_BG_FALLBACK,
    overlayDepth: 0.70,
    bloomColour: 'rgba(180,150,60,0.18)',
    bloomOpacity: 0.75,
    smokeIntensity: 'whisper',
    smokeTint: 'rgba(200,170,100,0.04)',
    material: 'leather',
    accentGlow: '#C8A030',
    entryTransition: 'depth-shift',
    vignetteStrength: 0.78,
    focalPoint: 'center 34%',
  },
};

export function getScene(id: SceneId): EnvironmentalScene {
  return SCENES[id];
}

/** Returns the full CSS background-image string for a scene including fallback. */
export function sceneBgStyle(
  scene: EnvironmentalScene,
  baseUrl: string
): CSSProperties {
  const url = `${baseUrl}images/${scene.bgImage}`;
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: 'cover',
    backgroundPosition: scene.focalPoint,
    backgroundRepeat: 'no-repeat',
  };
}

/** Returns the vignette box-shadow string for the given scene. */
export function sceneVignette(scene: EnvironmentalScene): string {
  const v = scene.vignetteStrength;
  return `inset 0 0 ${Math.round(v * 220)}px ${Math.round(v * 80)}px rgba(0,0,0,${(v * 0.9).toFixed(2)})`;
}

const WISPS = [
  { left: '8%', width: 118, height: 172, dur: '13s', del: '0s', dx: '16px', dx2: '-14px' },
  { left: '24%', width: 92, height: 138, dur: '10s', del: '1.7s', dx: '-10px', dx2: '13px' },
  { left: '43%', width: 152, height: 218, dur: '15s', del: '0.8s', dx: '12px', dx2: '-16px' },
  { left: '62%', width: 104, height: 156, dur: '12s', del: '2.5s', dx: '-14px', dx2: '10px' },
  { left: '80%', width: 132, height: 188, dur: '14s', del: '1.2s', dx: '10px', dx2: '-12px' },
] as const;

const EMBERS = [
  { left: '13%', bottom: '9%', dur: '4.2s', del: '0s', dx: '8px', dx2: '-6px' },
  { left: '31%', bottom: '12%', dur: '5.8s', del: '1.1s', dx: '-10px', dx2: '7px' },
  { left: '52%', bottom: '7%', dur: '4.8s', del: '0.5s', dx: '6px', dx2: '-8px' },
  { left: '74%', bottom: '14%', dur: '6.2s', del: '2.1s', dx: '-8px', dx2: '10px' },
] as const;

const TRANSITION_CLASS: Record<TransitionType, string> = {
  'smoke-fade': 'env-enter-smoke',
  'light-bloom': 'env-enter-bloom',
  'depth-shift': 'env-enter-depth',
  'ember-cross': 'env-enter-smoke',
};

interface EnvironmentalSceneStackProps {
  sceneId: SceneId;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  baseUrl?: string;
}

export function EnvironmentalSceneStack({
  sceneId,
  children,
  className = '',
  contentClassName = '',
  style,
  baseUrl = import.meta.env.BASE_URL ?? '/',
}: EnvironmentalSceneStackProps) {
  const scene = getScene(sceneId);
  const bgUrl = `${baseUrl}images/${scene.bgImage}`;
  const stackStyle: CSSProperties = {
    '--env-bg': `url("${bgUrl}")`,
    '--env-bg-fallback': scene.bgFallback,
    '--env-bg-position': scene.focalPoint,
    '--env-overlay-depth': scene.overlayDepth,
    '--env-bloom-color': scene.bloomColour,
    '--env-bloom-opacity': scene.bloomOpacity,
    '--env-smoke-tint': scene.smokeTint,
    '--env-accent': scene.accentGlow,
    ...style,
  } as CSSProperties;

  const wisps = scene.smokeIntensity === 'none' ? null : createElement(
    'div',
    { className: `env-smoke-layer env-smoke-layer--${scene.smokeIntensity}`, 'aria-hidden': true },
    WISPS.map((w, i) => createElement('div', {
      key: `wisp-${i}`,
      className: 'env-wisp',
      style: {
        left: w.left,
        width: w.width,
        height: w.height,
        '--w-dur': w.dur,
        '--w-del': w.del,
        '--w-dx': w.dx,
        '--w-dx2': w.dx2,
      } as CSSProperties,
    }))
  );

  const embers = scene.id === 'control-chamber' ? null : createElement(
    'div',
    { className: 'env-ember-layer', 'aria-hidden': true },
    EMBERS.map((e, i) => createElement('div', {
      key: `ember-${i}`,
      className: 'env-ember',
      style: {
        left: e.left,
        bottom: e.bottom,
        '--e-dur': e.dur,
        '--e-del': e.del,
        '--e-dx': e.dx,
        '--e-dx2': e.dx2,
      } as CSSProperties,
    }))
  );

  return createElement(
    'section',
    {
      className: `env-depth-stack ${TRANSITION_CLASS[scene.entryTransition]} mat-${scene.material} ${className}`.trim(),
      style: stackStyle,
      'aria-label': scene.identity,
    },
    createElement('div', { className: 'env-scene-bg', 'aria-hidden': true }),
    createElement('div', { className: 'env-reflection-layer', 'aria-hidden': true }),
    createElement('div', { className: 'env-overlay', 'aria-hidden': true }),
    createElement('div', { className: 'env-bloom', 'aria-hidden': true }),
    wisps,
    embers,
    createElement('div', { className: 'env-vignette', 'aria-hidden': true }),
    createElement('div', { className: `env-content ${contentClassName}`.trim() }, children)
  );
}
