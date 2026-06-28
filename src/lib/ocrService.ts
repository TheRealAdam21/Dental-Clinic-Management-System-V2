import Tesseract from "tesseract.js";

export type OcrProgress = {
  status: string;
  progress: number;
};

const preprocessImage = (dataUrl: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }

      const scale = Math.min(1, 2000 / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const contrast = 1.35;
      const intercept = 128 * (1 - contrast);

      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.min(255, Math.max(0, pixels[i] * contrast + intercept));
        pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] * contrast + intercept));
        pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] * contrast + intercept));
      }

      context.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    image.onerror = () => reject(new Error("Failed to load image for OCR"));
    image.src = dataUrl;
  });

export const recognizeTextFromImage = async (
  imageDataUrl: string,
  onProgress?: (progress: OcrProgress) => void
): Promise<string> => {
  const prepared = await preprocessImage(imageDataUrl);
  const result = await Tesseract.recognize(prepared, "eng", {
    logger: (message) => {
      if (message.status === "recognizing text" && typeof message.progress === "number") {
        onProgress?.({
          status: "Reading text from image...",
          progress: Math.round(message.progress * 100),
        });
      } else if (message.status) {
        onProgress?.({
          status: message.status,
          progress: 0,
        });
      }
    },
  });

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
