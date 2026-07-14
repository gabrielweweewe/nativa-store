export type ProductCategory = "Roupas" | "Bolsas" | "Acessórios";

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductSize {
  label: string;
  available: boolean;
}

export interface ProductFaq {
  question: string;
  answer: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  category: ProductCategory;
  price: number;
  originalPrice: number | null;
  image: string;
  images: string[];
  badge: string;
  badgeColor: string;
  rating: number;
  reviews: number;
  featured: boolean;
  shortDescription: string;
  description: string;
  materials: string[];
  careInstructions: string[];
  artisan: {
    name: string;
    region: string;
    story: string;
  };
  sizes: ProductSize[];
  colors: ProductColor[];
  sku: string;
  inStock: boolean;
  stockCount: number;
  widthCm?: number | null;
  heightCm?: number | null;
  lengthCm?: number | null;
  weightKg?: number | null;
  faq: ProductFaq[];
  highlights: string[];
  regionId: string | null;
}
