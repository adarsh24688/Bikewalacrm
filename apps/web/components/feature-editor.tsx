"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/image-upload";

interface Feature {
  title: string;
  description?: string;
  imageUrl?: string;
}

interface FeatureEditorProps {
  value: Feature[];
  onChange: (value: Feature[]) => void;
}

export function FeatureEditor({ value, onChange }: FeatureEditorProps) {
  const add = () => {
    onChange([...value, { title: "" }]);
  };

  const update = (index: number, field: keyof Feature, val: string | undefined) => {
    const updated = [...value];
    (updated[index] as any)[field] = val;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {value.map((feature, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Feature title"
              value={feature.title}
              onChange={(e) => update(i, "title", e.target.value)}
              className="flex-1"
            />
            <Button variant="ghost" size="sm" onClick={() => remove(i)}>
              ✕
            </Button>
          </div>
          <Textarea
            placeholder="Description (optional)"
            value={feature.description || ""}
            onChange={(e) => update(i, "description", e.target.value)}
            rows={2}
          />
          <ImageUpload
            value={feature.imageUrl}
            onChange={(url) => update(i, "imageUrl", url)}
            label="Feature image"
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        + Add Feature
      </Button>
    </div>
  );
}
