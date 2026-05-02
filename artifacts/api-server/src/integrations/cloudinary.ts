/**
 * Cloudinary client singleton.
 *
 * CLOUDINARY_URL is read from the environment.  The build banner in build.mjs
 * normalises the value before the SDK can inspect it (strips the common
 * "CLOUDINARY_URL=cloudinary://…" copy-paste prefix if present).
 *
 * The SDK is imported unconditionally so the rest of the app can start even
 * when the secret is absent or malformed — a helpful error is thrown only when
 * an upload is actually attempted (see assertCloudinaryConfigured()).
 */

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({ secure: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

const _badUrl   = process.env["__CLOUDINARY_URL_BAD__"];
const _goodUrl  = process.env["CLOUDINARY_URL"];

/**
 * Call this inside any route that requires Cloudinary.
 * Throws a descriptive Error when the secret is absent or in the wrong format.
 */
export function assertCloudinaryConfigured(): void {
  if (_badUrl) {
    throw new Error(
      `CLOUDINARY_URL is not in the correct format. ` +
      `Expected: cloudinary://API_KEY:API_SECRET@CLOUD_NAME — ` +
      `find it in Cloudinary Dashboard → Settings → Access Keys → SDK. ` +
      `Current value starts with: "${_badUrl.slice(0, 30)}…"`,
    );
  }
  if (!_goodUrl) {
    throw new Error(
      `CLOUDINARY_URL is not set. ` +
      `Add it as a Replit Secret. ` +
      `Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME`,
    );
  }
}

export default cloudinary;
