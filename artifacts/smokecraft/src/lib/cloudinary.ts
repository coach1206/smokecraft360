/**
 * Cloudinary image URL helpers.
 * Kept separate from React component files so Vite Fast Refresh works correctly.
 */

/**
 * Inject Cloudinary transformation parameters into a Cloudinary image URL.
 * For non-Cloudinary URLs the original string is returned unchanged.
 */
export function cloudinaryOptimize(url: string, width: number, height: number): string {
  if (!url?.includes("res.cloudinary.com")) return url;
  return url.replace(
    "/upload/",
    `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`,
  );
}
