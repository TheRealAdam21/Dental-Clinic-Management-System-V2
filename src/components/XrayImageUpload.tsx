
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getWatchDirectory, isTauriRuntime, scanInboxForPatient, setWatchDirectory } from "@/lib/tauriXray";

interface XrayImageUploadProps {
  visitId?: string;
  patientId?: string;
  existingImages?: string[];
  onImagesChange: (images: string[]) => void;
}

const XRAY_INBOX_KEY = "toothtime.xray.inbox.path";

const toSafePathSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_");

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const XrayImageUpload = ({ visitId, patientId, existingImages = [], onImagesChange }: XrayImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>(existingImages);
  const [scannerInboxPath, setScannerInboxPath] = useState(localStorage.getItem(XRAY_INBOX_KEY) || "");
  const [autoImportEnabled, setAutoImportEnabled] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const inboxInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setImages(existingImages);
  }, [existingImages]);

  useEffect(() => {
    const tauri = isTauriRuntime();
    setIsTauri(tauri);
    if (!tauri) return;

    getWatchDirectory()
      .then((dir) => {
        if (dir) setScannerInboxPath(dir);
      })
      .catch(() => {
        // Keep local fallback value only.
      });
  }, []);

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop() || "png";
    const safePatient = toSafePathSegment(patientId || "unassigned");
    const dateFolder = new Date().toISOString().split("T")[0];
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${fileExt}`;
    const filePath = `${safePatient}/${dateFolder}/${fileName}`;

    try {
      setUploading(true);

      if (!supabase) {
        // Offline/local fallback: keep image as data URL until sync-enabled upload is available.
        const localUrl = await fileToDataUrl(file);
        const newImages = [...images, localUrl];
        setImages(newImages);
        onImagesChange(newImages);
        toast.success("X-ray stored locally (offline mode).");
        return;
      }

      const { error: uploadError } = await supabase.storage.from('xrays').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('xrays')
        .getPublicUrl(filePath);

      const newImages = [...images, data.publicUrl];
      setImages(newImages);
      onImagesChange(newImages);
      
      toast.success("X-ray image uploaded successfully!");
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Failed to upload X-ray image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const uploadDataUrlAsImage = async (dataUrl: string, preferredName: string) => {
    const [meta, base64] = dataUrl.split(",");
    if (!meta || !base64) return;
    const mime = meta.match(/data:(.*?);base64/)?.[1] || "image/png";
    const ext = mime.split("/")[1] || "png";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const file = new File([bytes], preferredName || `xray-import.${ext}`, { type: mime });
    await uploadImage(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        await uploadImage(file);
      } else {
        toast.error("Please select a valid image file.");
      }
    }
    e.target.value = "";
  };

  const handleInboxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) {
      toast.error("No image files found in selected folder.");
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        await uploadImage(file);
      }
      toast.success(`Imported ${files.length} X-ray image${files.length > 1 ? "s" : ""}.`);
    } catch (error) {
      console.error("Inbox import error:", error);
      toast.error("Some X-ray files failed to import.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const importFromTauriWatchFolder = async () => {
    if (!isTauri || !patientId) {
      toast.error("Tauri auto-import requires a selected patient.");
      return;
    }
    try {
      const result = await scanInboxForPatient(patientId);
      if (!result || result.imported_count === 0) return;

      for (let i = 0; i < result.imported_data_urls.length; i++) {
        const dataUrl = result.imported_data_urls[i];
        const fileName = result.imported_file_names[i] || `xray-import-${i + 1}.png`;
        await uploadDataUrlAsImage(dataUrl, fileName);
      }
      toast.success(`Auto-imported ${result.imported_count} X-ray image${result.imported_count > 1 ? "s" : ""}.`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to scan watched X-ray folder.");
    }
  };

  useEffect(() => {
    if (!isTauri || !autoImportEnabled || !patientId) return;
    const interval = window.setInterval(() => {
      importFromTauriWatchFolder().catch(() => {});
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isTauri, autoImportEnabled, patientId]);

  const removeImage = async (imageUrl: string, index: number) => {
    try {
      if (supabase && imageUrl.startsWith("http")) {
        const marker = "/storage/v1/object/public/xrays/";
        const markerIndex = imageUrl.indexOf(marker);
        if (markerIndex !== -1) {
          const filePath = imageUrl.slice(markerIndex + marker.length);
          await supabase.storage
            .from('xrays')
            .remove([filePath]);
        }
      }

      const newImages = images.filter((_, i) => i !== index);
      setImages(newImages);
      onImagesChange(newImages);
      
      toast.success("X-ray image removed successfully!");
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error("Failed to remove X-ray image.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3 bg-muted/20">
        <Label htmlFor={`xray-inbox-${visitId || patientId || "global"}`} className="block text-sm font-medium mb-2">
          X-ray Scanner Inbox (Source Folder)
        </Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id={`xray-inbox-${visitId || patientId || "global"}`}
            value={scannerInboxPath}
            onChange={(e) => setScannerInboxPath(e.target.value)}
            placeholder="Example: /Scans/XrayInbox (label/reference only)"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              localStorage.setItem(XRAY_INBOX_KEY, scannerInboxPath.trim());
              if (isTauri) {
                setWatchDirectory(scannerInboxPath.trim()).catch((error: any) =>
                  toast.error(error?.message || "Failed to save Tauri watch directory.")
                );
              }
              toast.success("Scanner inbox location saved.");
            }}
          >
            Save Location
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {isTauri
            ? "For Tauri desktop: save folder once, then use Auto-import or Scan Now."
            : "Use \"Import from Scanner Folder\" below to pick files from that location and auto-assign them to this patient."}
        </p>
        {isTauri && patientId && (
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button type="button" variant={autoImportEnabled ? "default" : "outline"} onClick={() => setAutoImportEnabled((v) => !v)}>
              {autoImportEnabled ? "Auto-import: ON" : "Auto-import: OFF"}
            </Button>
            <Button type="button" variant="outline" onClick={importFromTauriWatchFolder}>
              Scan Watched Folder Now
            </Button>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="xray-upload" className="block text-sm font-medium mb-2">
          X-ray Images
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="xray-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            ref={uploadInputRef}
          />
          <Input
            type="file"
            accept="image/*"
            onChange={handleInboxImport}
            disabled={uploading}
            className="hidden"
            ref={inboxInputRef}
            multiple
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload X-ray'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => inboxInputRef.current?.click()}
            disabled={uploading}
          >
            Import from Scanner Folder
          </Button>
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((imageUrl, index) => (
            <Card key={index} className="relative">
              <CardContent className="p-2">
                <div className="relative group">
                  <img
                    src={imageUrl}
                    alt={`X-ray ${index + 1}`}
                    className="w-full h-32 object-cover rounded cursor-pointer"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="secondary">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>X-ray Image {index + 1}</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center">
                          <img
                            src={imageUrl}
                            alt={`X-ray ${index + 1}`}
                            className="max-w-full max-h-[70vh] object-contain"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeImage(imageUrl, index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Badge variant="secondary" className="mt-1 text-xs">
                  X-ray {index + 1}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default XrayImageUpload;
