import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadLogoAsDataUrl() {
  try {
    const logoPath = path.resolve(__dirname, "../../../frontend/src/assets/images/logo.png");
    const buffer = await fs.readFile(logoPath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (_error) {
    return null;
  }
}
