"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/lib/hooks";
import { ProductForm } from "@/components/product-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProductData {
  id: string;
  name: string;
  category: string;
  subSegment?: string;
  tagline?: string;
  description?: string;
  basePrice: number;
  unit?: string;
  heroImage?: string;
  images?: string[];
  colorVariants?: { name: string; hexCode: string; imageUrl?: string }[];
  specifications?: { key: string; value: string }[];
  features?: { title: string; description?: string; imageUrl?: string }[];
  trims?: { name: string; priceDiff: number }[];
  isActive: boolean;
  sortOrder: number;
}

export default function EditProductPage() {
  const params = useParams();
  const { fetch: apiFetch, isReady } = useApi();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    apiFetch<ProductData>(`/products/${params.id}`)
      .then((data) => {
        setProduct(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load product");
      })
      .finally(() => setLoading(false));
  }, [apiFetch, isReady, params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading product...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
        <p className="text-muted-foreground text-sm">{product.name}</p>
      </div>
      <ProductForm
        mode="edit"
        initialData={{
          id: product.id,
          name: product.name,
          category: product.category,
          subSegment: product.subSegment || "",
          tagline: product.tagline || "",
          description: product.description || "",
          basePrice: String(product.basePrice),
          unit: product.unit || "unit",
          heroImage: product.heroImage,
          images: product.images || [],
          colorVariants: product.colorVariants || [],
          specifications: product.specifications || [],
          features: product.features || [],
          trims: product.trims || [],
          isActive: product.isActive,
          sortOrder: product.sortOrder,
        }}
      />
    </div>
  );
}
