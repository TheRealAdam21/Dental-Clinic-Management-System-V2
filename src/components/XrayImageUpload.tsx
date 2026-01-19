
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface XrayImageUploadProps {
  visitId?: string;
  existingImages?: string[];
  onImagesChange: (images: string[]) => void;
}

const XrayImageUpload = ({ visitId, existingImages = [], onImagesChange }: XrayImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>(existingImages);

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('xrays')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        uploadImage(file);
      } else {
        toast.error("Please select a valid image file.");
      }
    }
  };

  const removeImage = async (imageUrl: string, index: number) => {
    try {
      // Extract the file path from the URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      // Delete from storage
      await supabase.storage
        .from('xrays')
        .remove([fileName]);

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
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('xray-upload')?.click()}
            disabled={uploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload X-ray'}
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
