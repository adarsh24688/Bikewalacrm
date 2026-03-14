"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check } from "lucide-react";

interface Product {
  id: string;
  name: string;
  basePrice: number;
  category: string | null;
  tagline?: string;
  heroImage?: string;
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

type ProductPickerModalProps =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      products: Product[];
      mode: "multi-select";
      selectedProductNames: string[];
      onSelectionChange: (names: string[]) => void;
      onProductSelect?: never;
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      products: Product[];
      mode: "single-add";
      selectedProductNames?: never;
      onSelectionChange?: never;
      onProductSelect: (product: Product) => void;
    };

export function ProductPickerModal(props: ProductPickerModalProps) {
  const { open, onOpenChange, products, mode } = props;
  const [activeTab, setActiveTab] = useState("all");

  // Local selection state for multi-select mode
  const [localSelection, setLocalSelection] = useState<string[]>([]);

  // Sync local selection when modal opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && mode === "multi-select") {
      setLocalSelection(props.selectedProductNames);
    }
    setActiveTab("all");
    onOpenChange(nextOpen);
  };

  const filteredProducts =
    activeTab === "all"
      ? products
      : products.filter((p) => p.category === activeTab);

  const toggleProduct = (name: string) => {
    setLocalSelection((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleDone = () => {
    if (mode === "multi-select") {
      props.onSelectionChange(localSelection);
    }
    onOpenChange(false);
  };

  const handleCardClick = (product: Product) => {
    if (mode === "single-add") {
      props.onProductSelect(product);
      onOpenChange(false);
    } else {
      toggleProduct(product.name);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "multi-select" ? "Select Vehicles" : "Add Vehicle"}
          </DialogTitle>
          <DialogDescription>
            {mode === "multi-select"
              ? "Select one or more vehicles the customer is interested in."
              : "Choose a vehicle to add to the quotation."}
          </DialogDescription>
        </DialogHeader>

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

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                No vehicles in this category.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 py-2">
              {filteredProducts.map((product) => {
                const isSelected =
                  mode === "multi-select" &&
                  localSelection.includes(product.name);

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleCardClick(product)}
                    className={`relative rounded-lg border overflow-hidden text-left transition-all hover:shadow-md ${
                      isSelected
                        ? "ring-2 ring-primary border-primary"
                        : "hover:border-foreground/20"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
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
                        <span className="text-3xl text-muted-foreground/30">
                          🏍
                        </span>
                      </div>
                    )}
                    <div className="p-2.5 space-y-1">
                      <h4 className="font-semibold text-xs truncate">
                        {product.name}
                      </h4>
                      {product.tagline && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {product.tagline}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5">
                        {product.category && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {product.category.toUpperCase()}
                          </Badge>
                        )}
                        <span className="ml-auto text-xs font-mono font-medium">
                          {formatPrice(Number(product.basePrice))}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {mode === "multi-select" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleDone}>
              Done
              {localSelection.length > 0 && (
                <Badge className="ml-2 h-5 min-w-[20px] justify-center px-1.5">
                  {localSelection.length}
                </Badge>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
