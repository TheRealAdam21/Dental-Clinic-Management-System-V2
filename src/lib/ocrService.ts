import { createWorker, type Worker, PSM } from "tesseract.js";

export type OcrProgress = {
  status: string;
  progress: number;
};

const TESSERACT_BASE = `${import.meta.env.BASE_URL}tesseract`;

let workerPromise: Promise<Worker> | null = null;

/** Progress sink for the recognition currently in flight (the worker logger is global). */
let activeProgress: ((progress: OcrProgress) => void) | null = null;

const friendlyStatus = (status: string): string => {
  switch (status) {
    case "loading tesseract core":
      return "Loading OCR engine...";
    case "initializing tesseract":
      return "Starting OCR engine...";
    case "loading language traineddata":
      return "Loading language data...";
    case "initializing api":
      return "Preparing OCR...";
    case "recognizing text":
      return "Reading text...";
    default:
      return status;
  }
};

const createOcrWorker = async (langPath?: string): Promise<Worker> => {
  const worker = await createWorker("eng", 1, {
    workerPath: `${TESSERACT_BASE}/worker.min.js`,
    corePath: `${TESSERACT_BASE}/`,
    ...(langPath ? { langPath } : {}),
    workerBlobURL: false,
    gzip: false,
    logger: (message) => {
      if (!activeProgress) return;
      const progress = Math.round((message.progress ?? 0) * 100);
      activeProgress({
        status: friendlyStatus(message.status),
        progress: Math.max(0, Math.min(100, progress)),
      });
    },
  });

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: "1",
  });

  return worker;
};

const getWorker = async (): Promise<Worker> => {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        // Prefer the language data shipped with the app so scanning works offline.
        return await createOcrWorker(TESSERACT_BASE);
      } catch (error) {
        console.warn("Bundled OCR language data could not be loaded, using the CDN copy.", error);
        return await createOcrWorker();
      }
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

/**
 * Turns a phone photo of a paper form into a clean black-and-white page.
 *
 * Adaptive thresholding (each pixel compared against the average brightness of
 * its neighbourhood) copes with the uneven lighting, shadows and greyish paper
 * that baked-in global thresholds struggle with, which is what makes photos of
 * physical records hard to read for OCR.
 */
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
        if (maxEdge === 0) {
          resolve(dataUrl);
          return;
        }

        // Tesseract works best around 2000-2500px on the long edge. Small crops
        // (e.g. a card) are upscaled so text is large enough to read.
        const scale = maxEdge < 1000 ? Math.min(2.5, 1600 / maxEdge) : Math.min(1, 2200 / maxEdge);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        canvas.width = width;
        canvas.height = height;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        const imageData = context.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        const total = width * height;

        // Grayscale + histogram so the histogram can stretch flat phone photos.
        const gray = new Uint8Array(total);
        const histogram = new Uint32Array(256);
        for (let pixel = 0, offset = 0; pixel < total; pixel++, offset += 4) {
          const value = Math.round(
            pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114
          );
          gray[pixel] = value;
          histogram[value] += 1;
        }

        let low = 0;
        let high = 255;
        let seen = 0;
        for (let value = 0; value < 256; value++) {
          seen += histogram[value];
          if (seen >= total * 0.02) {
            low = value;
            break;
          }
        }
        seen = 0;
        for (let value = 255; value >= 0; value--) {
          seen += histogram[value];
          if (seen >= total * 0.02) {
            high = value;
            break;
          }
        }

        const range = Math.max(1, high - low);
        for (let pixel = 0; pixel < total; pixel++) {
          gray[pixel] = Math.min(255, Math.max(0, Math.round(((gray[pixel] - low) / range) * 255)));
        }

        // Integral image for O(1) neighbourhood averages.
        const stride = width + 1;
        const integral = new Uint32Array(stride * (height + 1));
        for (let y = 0; y < height; y++) {
          let rowSum = 0;
          const rowOffset = (y + 1) * stride;
          const previousRowOffset = y * stride;
          for (let x = 0; x < width; x++) {
            rowSum += gray[y * width + x];
            integral[rowOffset + x + 1] = integral[previousRowOffset + x + 1] + rowSum;
          }
        }

        const radius = Math.max(8, Math.round(Math.min(width, height) / 40));
        for (let y = 0; y < height; y++) {
          const top = Math.max(0, y - radius);
          const bottom = Math.min(height - 1, y + radius);
          for (let x = 0; x < width; x++) {
            const left = Math.max(0, x - radius);
            const right = Math.min(width - 1, x + radius);
            const count = (right - left + 1) * (bottom - top + 1);
            const sum =
              integral[(bottom + 1) * stride + (right + 1)] -
              integral[top * stride + (right + 1)] -
              integral[(bottom + 1) * stride + left] +
              integral[top * stride + left];
            const mean = sum / count;
            const pixel = y * width + x;
            const value = gray[pixel] < mean - 8 ? 0 : 255;
            const offset = pixel * 4;
            pixels[offset] = value;
            pixels[offset + 1] = value;
            pixels[offset + 2] = value;
            pixels[offset + 3] = 255;
          }
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
  onProgress?.({ status: "Preparing image...", progress: 2 });
  const prepared = await preprocessImage(imageDataUrl);

  onProgress?.({ status: "Starting OCR engine...", progress: 5 });
  const worker = await getWorker();

  activeProgress = onProgress ?? null;
  try {
    const result = await worker.recognize(prepared);
    onProgress?.({ status: "Reading text...", progress: 100 });
    return result.data.text.trim();
  } finally {
    activeProgress = null;
  }
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
        status:
          imageDataUrls.length > 1
            ? `Page ${index + 1} of ${imageDataUrls.length}: ${pageProgress.status}`
            : pageProgress.status,
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
