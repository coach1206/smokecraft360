/**
 * Upload route — accepts a single image file and stores it on Cloudinary.
 *
 * POST /api/upload
 *   field:  "image"  (multipart/form-data)
 *   auth:   required (any authenticated user)
 *   return: { url: string }
 *
 * The file is streamed directly from memory to Cloudinary — no temp files
 * are written to disk.  Size limit: 8 MB.
 */

import { Router, type IRouter, type Response } from "express";
import multer                                    from "multer";
import cloudinary, { assertCloudinaryConfigured } from "../integrations/cloudinary";
import { requireAuth, type AuthRequest }          from "../middleware/auth";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 8 * 1024 * 1024 },   // 8 MB
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP, GIF, and AVIF images are accepted"));
  },
});

router.post(
  "/",
  requireAuth,
  upload.single("image"),
  async (req: AuthRequest, res: Response) => {
    try {
      assertCloudinaryConfigured();
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: '"image" file field is required' });
      return;
    }

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:           "smokecraft",
          transformation:   [{ width: 800, height: 600, crop: "fill", quality: "auto", fetch_format: "auto" }],
          resource_type:    "image",
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error("Cloudinary upload returned no result"));
          } else {
            resolve(uploadResult);
          }
        },
      );
      stream.end(req.file!.buffer);
    });

    req.log.info({ userId: req.user?.id, url: result.secure_url }, "image uploaded");
    res.json({ url: result.secure_url });
  },
);

export default router;
