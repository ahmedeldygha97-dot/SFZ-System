import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

export function resolveProjectRoot() {
  return PROJECT_ROOT;
}

export function resolveUploadsPath(...segments) {
  return path.resolve(resolveProjectRoot(), "uploads", ...segments);
}

export async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

export function buildStoredFileName(originalName = "file.bin") {
  const extension = path.extname(originalName) || "";
  return `${Date.now()}-${crypto.randomUUID().replace(/-/g, "")}${extension}`;
}

export async function saveBase64File({
  targetDirectory,
  originalName,
  contentBase64
}) {
  await ensureDirectory(targetDirectory);
  const storedFileName = buildStoredFileName(originalName);
  const absolutePath = path.join(targetDirectory, storedFileName);
  const buffer = Buffer.from(contentBase64, "base64");

  await fs.writeFile(absolutePath, buffer);

  return {
    buffer,
    storedFileName,
    absolutePath
  };
}

export async function removeFileIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
