"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/image-upload";

interface ColorVariant {
  name: string;
  hexCode: string;
  imageUrl?: string;
}

interface ColorVariantEditorProps {
  value: ColorVariant[];
  onChange: (value: ColorVariant[]) => void;
}

export function ColorVariantEditor({ value, onChange }: ColorVariantEditorProps) {
  const add = () => {
    onChange([...value, { name: "", hexCode: "#000000" }]);
  };

  const update = (index: number, field: keyof ColorVariant, val: string | undefined) => {
    const updated = [...value];
    (updated[index] as any)[field] = val;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {value.map((color, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color.hexCode}
              onChange={(e) => update(i, "hexCode", e.target.value)}
              className="h-9 w-9 rounded border cursor-pointer p-0.5"
            />
            <Input
              placeholder="Color name"
              value={color.name}
              onChange={(e) => update(i, "name", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="#hex"
              value={color.hexCode}
              onChange={(e) => update(i, "hexCode", e.target.value)}
              className="w-28"
            />
            <Button variant="ghost" size="sm" onClick={() => remove(i)}>
              ✕
            </Button>
          </div>
          <ImageUpload
            value={color.imageUrl}
            onChange={(url) => update(i, "imageUrl", url)}
            label="Color image"
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        + Add Color
      </Button>
    </div>
  );
}
