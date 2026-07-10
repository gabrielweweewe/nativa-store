import type { Banner } from "@shared/types/banner";

const FALLBACK_BANNER: Banner = {
  id: "fallback",
  title: "Banner principal",
  altText: "Nativa — Fauna e flora brasileira",
  imageUrl: "/images/bannerNativa.jpg",
  imageUrlMobile: null,
  linkUrl: null,
  objectPosition: "center center",
  objectPositionMobile: "center 22%",
  sortOrder: 0,
  isActive: true,
  createdAt: "",
  updatedAt: "",
};

export async function fetchActiveBanners(): Promise<Banner[]> {
  try {
    const response = await fetch("/api/banners");
    if (!response.ok) {
      return [FALLBACK_BANNER];
    }
    const data = (await response.json()) as Banner[];
    return data.length > 0 ? data : [FALLBACK_BANNER];
  } catch {
    return [FALLBACK_BANNER];
  }
}

export { FALLBACK_BANNER };
