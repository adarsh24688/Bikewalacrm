"use client";

import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Product</h1>
        <p className="text-muted-foreground text-sm">
          Add a new Honda 2-wheeler to the catalog
        </p>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}
