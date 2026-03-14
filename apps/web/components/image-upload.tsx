"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/hooks";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const { upload } = useApi();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const result = await upload<{ url: string }>("/uploads/image", file);
      onChange(result.url);
    } catch {
      // silently fail
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Uploaded"
            className="h-24 w-24 rounded-md object-cover border"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 text-xs"
            onClick={() => onChange(undefined)}
          >
            ✕
          </Button>
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
        </div>
      )}
    </div>
  );
}
