export type FeedExclusionReason = "sem imagem" | "sem preço";

export interface MetaCatalogSettingsInput {
  enabled: boolean;
  feedToken?: string | null;
  regenerateFeedToken?: boolean;
  defaultBrand: string;
  googleProductCategory: string;
}

export interface MetaCatalogAdminStatus {
  enabled: boolean;
  hasFeedToken: boolean;
  feedToken: string | null;
  defaultBrand: string;
  googleProductCategory: string;
  lastGeneratedAt: string | null;
  productCount: number;
  excludedCount: number;
  feedUrl: string;
  synced: boolean;
}

export interface MetaCatalogExclusion {
  id: string;
  name: string;
  reason: FeedExclusionReason;
}

export interface MetaCatalogTestResult {
  included: number;
  excluded: number;
  exclusions: MetaCatalogExclusion[];
  productCount: number;
  excludedCount: number;
  lastGeneratedAt: string;
}

export interface FeedProductItem {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  price: string;
  availability: "in stock" | "out of stock";
  condition: "new";
  brand: string;
  googleProductCategory?: string;
  productType?: string;
}
