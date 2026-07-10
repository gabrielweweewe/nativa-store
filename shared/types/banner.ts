export interface Banner {
  id: string;
  title: string;
  altText: string;
  imageUrl: string;
  imageUrlMobile: string | null;
  linkUrl: string | null;
  objectPosition: string;
  objectPositionMobile: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BannerInput = {
  title: string;
  altText: string;
  imageUrl: string;
  imageUrlMobile?: string | null;
  linkUrl?: string | null;
  objectPosition?: string;
  objectPositionMobile?: string;
  sortOrder?: number;
  isActive?: boolean;
};
