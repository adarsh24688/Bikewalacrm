"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Product {
  id: string;
  name: string;
  category: string;
  subSegment?: string;
  tagline?: string;
  description?: string;
  basePrice: number;
  unit?: string;
  heroImage?: string;
  isActive: boolean;
  sortOrder: number;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "ev", label: "EV" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "scooter", label: "Scooter" },
];

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

export default function ProductsSettingsPage() {
  const { fetch: apiFetch, isReady } = useApi();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Product[]>("/products");
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!isReady) return;
    fetchProducts();
  }, [fetchProducts, isReady]);

  const filteredProducts =
    activeTab === "all"
      ? products
      : products.filter((p) => p.category === activeTab);

  const handleDelete = async (product: Product) => {
    if (!confirm(`Deactivate "${product.name}"?`)) return;
    try {
      await apiFetch(`/products/${product.id}`, { method: "DELETE" });
      await fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Products</h1>
          <p className="text-muted-foreground text-sm hidden sm:block">
            Honda 2-wheeler product catalog
          </p>
        </div>
        <Button onClick={() => router.push("/settings/products/new")} className="shrink-0">
          Add Product
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <TabsList className="flex-wrap">
        {CATEGORIES.map((cat) => (
          <TabsTrigger
            key={cat.value}
            value={cat.value}
            active={activeTab === cat.value}
            onClick={() => setActiveTab(cat.value)}
          >
            {cat.label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {cat.value === "all"
                ? products.length
                : products.filter((p) => p.category === cat.value).length}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            No products found. Add your first product to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/settings/products/${product.id}`)}
            >
              {product.heroImage ? (
                <div className="aspect-[16/10] bg-muted overflow-hidden">
                  <img
                    src={product.heroImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[16/10] bg-muted flex items-center justify-center">
                  <span className="text-4xl text-muted-foreground/30">🏍</span>
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                    {product.tagline && (
                      <p className="text-xs text-muted-foreground truncate">
                        {product.tagline}
                      </p>
                    )}
                  </div>
                  {!product.isActive && (
                    <Badge variant="outline" className="shrink-0">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {product.category.toUpperCase()}
                  </Badge>
                  {product.subSegment && (
                    <Badge variant="outline" className="text-xs">
                      {product.subSegment}
                    </Badge>
                  )}
                  <span className="ml-auto text-sm font-mono font-medium">
                    {formatPrice(Number(product.basePrice))}
                  </span>
                </div>
                <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/settings/products/${product.id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(product)}
                  >
                    Deactivate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
