"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageUpload } from "@/components/image-upload";
import { ColorVariantEditor } from "@/components/color-variant-editor";
import { SpecEditor } from "@/components/spec-editor";
import { FeatureEditor } from "@/components/feature-editor";
import { TrimEditor } from "@/components/trim-editor";

interface ColorVariant {
  name: string;
  hexCode: string;
  imageUrl?: string;
}

interface Specification {
  key: string;
  value: string;
}

interface Feature {
  title: string;
  description?: string;
  imageUrl?: string;
}

interface Trim {
  name: string;
  priceDiff: number;
}

interface ProductFormData {
  name: string;
  category: string;
  subSegment: string;
  tagline: string;
  description: string;
  basePrice: string;
  unit: string;
  heroImage?: string;
  images: string[];
  colorVariants: ColorVariant[];
  specifications: Specification[];
  features: Feature[];
  trims: Trim[];
  isActive: boolean;
  sortOrder: number;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData> & { id?: string };
  mode: "create" | "edit";
}

const emptyForm: ProductFormData = {
  name: "",
  category: "motorcycle",
  subSegment: "",
  tagline: "",
  description: "",
  basePrice: "",
  unit: "unit",
  heroImage: undefined,
  images: [],
  colorVariants: [],
  specifications: [],
  features: [],
  trims: [],
  isActive: true,
  sortOrder: 0,
};

export function ProductForm({ initialData, mode }: ProductFormProps) {
  const { fetch: apiFetch } = useApi();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ProductFormData>(() => {
    if (!initialData) return emptyForm;
    return {
      name: initialData.name || "",
      category: initialData.category || "motorcycle",
      subSegment: initialData.subSegment || "",
      tagline: initialData.tagline || "",
      description: initialData.description || "",
      basePrice: initialData.basePrice || "",
      unit: initialData.unit || "unit",
      heroImage: initialData.heroImage,
      images: initialData.images || [],
      colorVariants: initialData.colorVariants || [],
      specifications: initialData.specifications || [],
      features: initialData.features || [],
      trims: initialData.trims || [],
      isActive: initialData.isActive ?? true,
      sortOrder: initialData.sortOrder ?? 0,
    };
  });

  const updateField = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category) return;
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      category: form.category,
      subSegment: form.subSegment?.trim() || undefined,
      tagline: form.tagline?.trim() || undefined,
      description: form.description?.trim() || undefined,
      basePrice: parseFloat(form.basePrice) || 0,
      unit: form.unit?.trim() || "unit",
      heroImage: form.heroImage || undefined,
      images: form.images.length > 0 ? form.images : undefined,
      colorVariants: form.colorVariants.length > 0 ? form.colorVariants : undefined,
      specifications: form.specifications.length > 0 ? form.specifications : undefined,
      features: form.features.length > 0 ? form.features : undefined,
      trims: form.trims.length > 0 ? form.trims : undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    };

    try {
      if (mode === "create") {
        await apiFetch("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/products/${initialData?.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      router.push("/settings/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Honda Activa 125"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                <option value="ev">EV</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="scooter">Scooter</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subSegment">Sub-Segment</Label>
              <Select
                id="subSegment"
                value={form.subSegment}
                onChange={(e) => updateField("subSegment", e.target.value)}
              >
                <option value="">None</option>
                <option value="RedWing">RedWing</option>
                <option value="BigWing">BigWing</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              placeholder="Short tagline"
              value={form.tagline}
              onChange={(e) => updateField("tagline", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Product description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (INR)</Label>
              <Input
                id="basePrice"
                type="number"
                placeholder="0"
                min="0"
                value={form.basePrice}
                onChange={(e) => updateField("basePrice", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="unit"
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={(e) => updateField("sortOrder", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => updateField("isActive", e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </CardContent>
      </Card>

      {/* Hero Image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUpload
            value={form.heroImage}
            onChange={(url) => updateField("heroImage", url)}
            label="Hero Image"
          />
          <div className="space-y-2">
            <Label>Hero Image URL (or paste directly)</Label>
            <Input
              placeholder="https://..."
              value={form.heroImage || ""}
              onChange={(e) => updateField("heroImage", e.target.value || undefined)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Color Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Color Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <ColorVariantEditor
            value={form.colorVariants}
            onChange={(v) => updateField("colorVariants", v)}
          />
        </CardContent>
      </Card>

      {/* Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <SpecEditor
            value={form.specifications}
            onChange={(v) => updateField("specifications", v)}
          />
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Features</CardTitle>
        </CardHeader>
        <CardContent>
          <FeatureEditor
            value={form.features}
            onChange={(v) => updateField("features", v)}
          />
        </CardContent>
      </Card>

      {/* Trims */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trim Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <TrimEditor
            value={form.trims}
            onChange={(v) => updateField("trims", v)}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/settings/products")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
