/**
 * Capacitor Native Bridge Configuration — NOVEE OS
 *
 * appId: com.profound.noveeos
 *
 * Targets: iPad (primary kiosk), Android tablet (secondary deployment)
 * DR Luxury Market: Villa Casa de Campo · Santo Domingo high-end venues
 *
 * Key kiosk hardening:
 *   ios.scrollEnabled = false       — no rubber-band overscroll
 *   android.captureInput = true     — all touch routed through WebView
 *   SplashScreen duration = 0       — instant boot from cache
 */

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId:   "com.profound.noveeos",
  appName: "NOVEE OS",
  webDir:  "dist",

  server: {
    androidScheme: "https",
    cleartext:     false,
    // During dev, point to Replit preview URL so the native shell can
    // hot-reload from the Vite dev server without a full Capacitor build.
    // Comment out or remove before production signing.
    // url: "https://<replit-preview>/",
  },

  ios: {
    scrollEnabled:    false,   // disables rubber-band overscroll — kiosk feel
    contentInset:     "never",
    backgroundColor:  "#000000",
    limitsNavigationsToAppBoundDomains: true,
  },

  android: {
    allowMixedContent:          false,
    captureInput:               true,   // all gestures captured by WebView
    webContentsDebuggingEnabled: false, // disable in production
    backgroundColor:            "#000000",
  },

  plugins: {
    SplashScreen: {
      launchShowDuration:        0,       // instant — assets pre-cached by SW
      backgroundColor:           "#000000",
      androidSplashResourceName: "splash",
      showSpinner:               false,
    },
    Keyboard: {
      resize: "none",   // prevent layout shifts on kiosk PIN entry
    },
  },
};

export default config;
