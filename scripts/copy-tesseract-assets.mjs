import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "public", "tesseract");
const tesseractDist = path.join(root, "node_modules", "tesseract.js", "dist");
const coreDir = path.join(root, "node_modules", "tesseract.js-core");

const exists = async (filePath) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const copyTesseractAssets = async () => {
  await mkdir(outputDir, { recursive: true });

  await copyFile(
    path.join(tesseractDist, "worker.min.js"),
    path.join(outputDir, "worker.min.js")
  );

  const coreFiles = await readdir(coreDir);
  const assets = coreFiles.filter(
    (file) => file.endsWith(".wasm") || file.endsWith(".wasm.js") || file.endsWith(".js")
  );

  await Promise.all(
    assets.map((file) =>
      copyFile(path.join(coreDir, file), path.join(outputDir, file))
    )
  );

  // Language data must be shipped with the app: without it Tesseract.js fetches
  // eng.traineddata from a CDN, which makes scanning fail when the clinic has no
  // internet connection. Keep a copy of eng.traineddata in the project root.
  const languageSource = path.join(root, "eng.traineddata");
  if (await exists(languageSource)) {
    await copyFile(languageSource, path.join(outputDir, "eng.traineddata"));
    console.log("Copied eng.traineddata for offline OCR");
  } else {
    console.warn(
      "eng.traineddata was not found in the project root. OCR will fall back to downloading " +
        "language data at runtime, which requires an internet connection."
    );
  }

  console.log(`Copied Tesseract assets to ${outputDir}`);
};

copyTesseractAssets().catch((error) => {
  console.error("Failed to copy Tesseract assets:", error);
  process.exit(1);
});
