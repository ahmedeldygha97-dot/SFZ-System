import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getSystemSettings } from "../services/settingsService.js";
import { resolveProjectRoot } from "./storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadLogoAsDataUrl() {
  try {
    const settings = await getSystemSettings();
    const preferredLogoPath = settings.logoPath
      ? path.resolve(resolveProjectRoot(), settings.logoPath)
      : path.resolve(__dirname, "../../../frontend/src/assets/images/logo.png");
    const buffer = await fs.readFile(preferredLogoPath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (_error) {
    try {
      const fallbackPath = path.resolve(__dirname, "../../../frontend/src/assets/images/logo.png");
      const fallbackBuffer = await fs.readFile(fallbackPath);
      return `data:image/png;base64,${fallbackBuffer.toString("base64")}`;
    } catch {
      return null;
    }
  }
}
