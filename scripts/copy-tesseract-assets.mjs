import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "public", "tesseract");
const tesseractDist = path.join(root, "node_modules", "tesseract.js", "dist");
const coreDir = path.join(root, "node_modules", "tesseract.js-core");

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

  console.log(`Copied Tesseract assets to ${outputDir}`);
};

copyTesseractAssets().catch((error) => {
  console.error("Failed to copy Tesseract assets:", error);
  process.exit(1);
});
