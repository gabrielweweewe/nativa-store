import type { Product } from "./product";

export interface Region {
  id: string;
  name: string;
  title: string;
  story: string;
  coverImage: string;
  productIds: number[];
  createdAt: string;
  updatedAt: string;
}

export type RegionWithProducts = Omit<Region, "productIds"> & {
  products: Product[];
};

export type RegionInput = {
  id: string;
  name: string;
  title: string;
  story: string;
  coverImage: string;
  productIds: number[];
};
