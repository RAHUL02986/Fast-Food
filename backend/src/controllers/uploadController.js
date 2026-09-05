import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const uploadImage = async (req, res, next) => {
  try {
    const { dataUrl } = req.body || {};

    if (!dataUrl || typeof dataUrl !== "string") {
      return res.status(400).json({ message: "dataUrl is required" });
    }

    const match = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ message: "Invalid image data URL" });
    }

    const [, mime, base64Data] = match;
    const ext = ALLOWED_MIME[mime];
    if (!ext) {
      return res.status(400).json({
        message: `Unsupported image type. Allowed: ${Object.keys(ALLOWED_MIME).join(", ")}`,
      });
    }

    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length === 0) {
      return res.status(400).json({ message: "Empty image file" });
    }
    if (buffer.length > MAX_SIZE_BYTES) {
      return res.status(400).json({ message: "Image too large (max 5 MB)" });
    }

    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.status(201).json({
      message: "Image uploaded successfully",
      url: `${baseUrl}/uploads/${filename}`,
    });
  } catch (error) {
    next(error);
  }
};
