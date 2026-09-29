"use client";
import React from "react";
import ProductsSection from "@/components/editor/ProductsSection";
import type { ProductItem } from "@/types/website";

export default function GeneratedProductsSection() {
  const products: ProductItem[] = ([{"id":"prod_0","name":"Oversized Organic Cotton Hoodie","price":65,"description":"Heavyweight French terry","category":"Featured","status":"active","images":["https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"]},{"id":"prod_1","name":"Raw Denim Jeans","price":85,"description":"Selvedge denim, tailored fit","category":"Featured","status":"active","images":["https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"]}]) as ProductItem[];

  return (
    <ProductsSection
      data={{
        title: "Featured Offerings",
        subtitle: "Explore our curated solutions and packages",
        products,
      }}
    />
  );
}
