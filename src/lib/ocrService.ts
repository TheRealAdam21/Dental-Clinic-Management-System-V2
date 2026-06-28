import { createWorker, type Worker, PSM } from "tesseract.js";

export type OcrProgress = {
  status: string;
  progress: number;
};

const TESSERACT_BASE = `${import.meta.env.BASE_URL}tesseract`;

let workerPromise: Promise<Worker> | null = null;

const getWorker = async (): Promise<Worker> => {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("eng", 1, {
        workerPath: `${TESSERACT_BASE}/worker.min.js`,
        corePath: `${TESSERACT_BASE}/`,
        workerBlobURL: false,
        gzip: false,
        logger: (message) => {
          if (message.status === "loading tesseract core") {
            console.debug("[OCR]", message.status, message.progress);
          }
        },
      });

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: "1",
      });

      return worker;
    })().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }

  return workerPromise;
};

export const terminateOcrWorker = async (): Promise<void> => {
  if (!workerPromise) return;
  const worker = await workerPromise;
  workerPromise = null;
  await worker.terminate();
};

const preprocessImage = (dataUrl: string): Promise<string> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(dataUrl);
          return;
        }

        const maxEdge = Math.max(image.width, image.height);
        const scale = maxEdge < 1200 ? 1200 / maxEdge : Math.min(1, 2400 / maxEdge);
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        for (let i = 0; i < pixels.length; i += 4) {
          const gray =
            pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
          const contrast = 1.4;
          const intercept = 128 * (1 - contrast);
          const adjusted = Math.min(255, Math.max(0, gray * contrast + intercept));
          const value = adjusted > 165 ? 255 : adjusted < 95 ? 0 : adjusted;
          pixels[i] = value;
          pixels[i + 1] = value;
          pixels[i + 2] = value;
        }

        context.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(dataUrl);
      }
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });

export const recognizeTextFromImage = async (
  imageDataUrl: string,
  onProgress?: (progress: OcrProgress) => void
): Promise<string> => {
  const prepared = await preprocessImage(imageDataUrl);
  const worker = await getWorker();

  const result = await worker.recognize(prepared);

  onProgress?.({ status: "Reading text from image...", progress: 100 });
  return result.data.text.trim();
};

export const recognizeTextFromImages = async (
  imageDataUrls: string[],
  onProgress?: (progress: OcrProgress) => void
): Promise<string> => {
  const chunks: string[] = [];

  for (let index = 0; index < imageDataUrls.length; index++) {
    const image = imageDataUrls[index];
    onProgress?.({
      status: `Scanning page ${index + 1} of ${imageDataUrls.length}...`,
      progress: Math.round((index / imageDataUrls.length) * 100),
    });

    const text = await recognizeTextFromImage(image, (pageProgress) => {
      const overall =
        ((index + pageProgress.progress / 100) / imageDataUrls.length) * 100;
      onProgress?.({
        status: pageProgress.status,
        progress: Math.round(overall),
      });
    });

    if (text) {
      chunks.push(text);
    }
  }

  onProgress?.({ status: "Parsing record fields...", progress: 100 });
  return chunks.join("\n\n--- PAGE BREAK ---\n\n");
};
