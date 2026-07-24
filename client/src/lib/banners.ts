import type { Banner } from "@shared/types/banner";

const FALLBACK_BANNER: Banner = {
  id: "fallback",
  title: "Banner principal",
  altText: "Nativa — Fauna e flora brasileira",
  imageUrl: "/images/bannerNativa.webp",
  imageUrlMobile: "/images/bannerNativa-mobile.webp",
  linkUrl: null,
  objectPosition: "center center",
  objectPositionMobile: "center 22%",
  sortOrder: 0,
  isActive: true,
  createdAt: "",
  updatedAt: "",
};

/** Seed antigo apontava para JPG pesado — usa WebP otimizado no cliente. */
function normalizeBanner(banner: Banner): Banner {
  let imageUrl = banner.imageUrl;
  let imageUrlMobile = banner.imageUrlMobile;

  if (imageUrl === "/images/bannerNativa.jpg") {
    imageUrl = FALLBACK_BANNER.imageUrl;
  }
  if (imageUrlMobile === "/images/bannerNativa.jpg" || (!imageUrlMobile && imageUrl === FALLBACK_BANNER.imageUrl)) {
    imageUrlMobile = FALLBACK_BANNER.imageUrlMobile;
  }

  if (imageUrl === banner.imageUrl && imageUrlMobile === banner.imageUrlMobile) {
    return banner;
  }

  return { ...banner, imageUrl, imageUrlMobile };
}

async function loadActiveBanners(): Promise<Banner[]> {
  try {
    const response = await fetch("/api/banners", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return [FALLBACK_BANNER];
    }
    const data = (await response.json()) as Banner[];
    if (data.length === 0) return [FALLBACK_BANNER];
    return data.map(normalizeBanner);
  } catch {
    return [FALLBACK_BANNER];
  }
}

/** Promise compartilhada — o fetch começa na 1ª importação do módulo. */
let activeBannersPromise: Promise<Banner[]> | null = null;

/** Dispara (ou reutiliza) o GET /api/banners o mais cedo possível. */
export function prefetchActiveBanners(): Promise<Banner[]> {
  if (!activeBannersPromise) {
    activeBannersPromise = loadActiveBanners();
  }
  return activeBannersPromise;
}

export async function fetchActiveBanners(): Promise<Banner[]> {
  return prefetchActiveBanners();
}

export { FALLBACK_BANNER };
