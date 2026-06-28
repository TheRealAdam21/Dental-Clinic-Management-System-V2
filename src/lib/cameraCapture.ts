import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export const captureRecordImage = async (): Promise<string | null> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        correctOrientation: true,
        promptLabelHeader: "Scan patient record",
        promptLabelPhoto: "Choose from gallery",
        promptLabelPicture: "Take photo",
      });
      return photo.dataUrl ?? null;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
};

export const pickRecordImages = async (): Promise<string[]> => {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) {
        resolve([]);
        return;
      }

      const readers = await Promise.all(
        files.map(
          (file) =>
            new Promise<string>((fileResolve, fileReject) => {
              const reader = new FileReader();
              reader.onload = () => fileResolve(String(reader.result));
              reader.onerror = () => fileReject(new Error("Failed to read image"));
              reader.readAsDataURL(file);
            })
        )
      );

      resolve(readers);
    };
    input.click();
  });
};
