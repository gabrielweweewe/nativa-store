import { useEffect } from "react";
import { getAppUrl, appPath } from "@/lib/appUrl";
import { absoluteUrl, truncateMeta } from "@shared/lib/seo";
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_OG_IMAGE_PATH,
  SITE_THEME_COLOR,
  SITE_TITLE,
  SITE_TWITTER_HANDLE,
} from "@shared/const/site";

export type PageMetaInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string | null;
  type?: "website" | "product" | "article";
  noIndex?: boolean;
  keywords?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Metas product:* (Open Graph commerce) */
  product?: {
    price: number;
    currency?: string;
    availability?: "in stock" | "out of stock";
    brand?: string;
  };
};

const MANAGED_ATTR = "data-nativa-seo";

function upsertMeta(selector: { name?: string; property?: string }, content: string) {
  const attr = selector.name
    ? `meta[name="${selector.name}"]`
    : `meta[property="${selector.property}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(`${attr}[${MANAGED_ATTR}]`);
  if (!el) {
    el = document.head.querySelector<HTMLMetaElement>(attr) ?? document.createElement("meta");
    if (selector.name) el.setAttribute("name", selector.name);
    if (selector.property) el.setAttribute("property", selector.property);
    el.setAttribute(MANAGED_ATTR, "true");
    if (!el.parentElement) document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"][${MANAGED_ATTR}]`);
  if (!el) {
    el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`) ?? document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute(MANAGED_ATTR, "true");
    if (!el.parentElement) document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(data: Record<string, unknown> | Record<string, unknown>[] | undefined) {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][${MANAGED_ATTR}]`)
    .forEach((node) => node.remove());

  if (!data) return;

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute(MANAGED_ATTR, "true");
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function removeProductMetas() {
  document.head
    .querySelectorAll(`meta[property^="product:"][${MANAGED_ATTR}]`)
    .forEach((node) => node.remove());
}

/** Aplica título, description, OG, Twitter, canonical e JSON-LD no <head>. */
export function applyPageMeta(input: PageMetaInput = {}) {
  const base = getAppUrl();
  const title = input.title?.trim() || SITE_TITLE;
  const description = truncateMeta(input.description?.trim() || SITE_DESCRIPTION);
  const path = input.path ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const url = absoluteUrl(base, path);
  const image = absoluteUrl(base, input.image || SITE_OG_IMAGE_PATH);
  const type = input.type ?? "website";

  document.title = title;

  upsertMeta({ name: "description" }, description);
  upsertMeta({ name: "theme-color" }, SITE_THEME_COLOR);
  upsertMeta(
    { name: "robots" },
    input.noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  );
  upsertMeta({ name: "googlebot" }, input.noIndex ? "noindex, nofollow" : "index, follow");

  if (input.keywords) {
    upsertMeta({ name: "keywords" }, input.keywords);
  }

  upsertLink("canonical", url);

  upsertMeta({ property: "og:locale" }, SITE_LOCALE);
  upsertMeta({ property: "og:type" }, type);
  upsertMeta({ property: "og:site_name" }, SITE_NAME);
  upsertMeta({ property: "og:title" }, title);
  upsertMeta({ property: "og:description" }, description);
  upsertMeta({ property: "og:url" }, url);
  upsertMeta({ property: "og:image" }, image);
  upsertMeta({ property: "og:image:alt" }, title);
  upsertMeta({ property: "og:image:type" }, image.endsWith(".png") ? "image/png" : "image/jpeg");

  upsertMeta({ name: "twitter:card" }, "summary_large_image");
  upsertMeta({ name: "twitter:site" }, SITE_TWITTER_HANDLE);
  upsertMeta({ name: "twitter:title" }, title);
  upsertMeta({ name: "twitter:description" }, description);
  upsertMeta({ name: "twitter:image" }, image);
  upsertMeta({ name: "twitter:image:alt" }, title);

  removeProductMetas();
  if (input.product) {
    upsertMeta({ property: "product:price:amount" }, String(input.product.price));
    upsertMeta({ property: "product:price:currency" }, input.product.currency ?? "BRL");
    upsertMeta(
      { property: "product:availability" },
      input.product.availability ?? "in stock",
    );
    upsertMeta({ property: "product:brand" }, input.product.brand ?? SITE_NAME);
    upsertMeta({ property: "product:retailer_item_id" }, path);
  }

  upsertJsonLd(input.jsonLd);
}

export function buildOrganizationJsonLd() {
  const base = getAppUrl();
  return {
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: SITE_NAME,
    url: base || undefined,
    logo: absoluteUrl(base, SITE_LOGO_PATH),
    description: SITE_DESCRIPTION,
  };
}

export function buildWebSiteJsonLd() {
  const base = getAppUrl();
  return {
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: SITE_NAME,
    url: base || undefined,
    description: SITE_DESCRIPTION,
    inLanguage: "pt-BR",
    publisher: { "@id": `${base}/#organization` },
  };
}

export function buildProductJsonLd(product: {
  name: string;
  slug: string;
  description: string;
  image: string | string[];
  price: number;
  sku?: string;
  category?: string;
  inStock: boolean;
  brand?: string;
}) {
  const images = Array.isArray(product.image) ? product.image : [product.image];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: truncateMeta(product.description, 5000),
    image: images.map((img) => absoluteUrl(getAppUrl(), img)),
    sku: product.sku,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: product.brand ?? SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      url: appPath(`/produto/${product.slug}`),
      priceCurrency: "BRL",
      price: product.price,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    },
  };
}

export function usePageMeta(input: PageMetaInput) {
  const productKey = input.product
    ? `${input.product.price}-${input.product.availability}-${input.product.currency ?? "BRL"}`
    : "";
  const jsonLdKey = input.jsonLd ? JSON.stringify(input.jsonLd) : "";

  useEffect(() => {
    applyPageMeta(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serialize complex fields above
  }, [
    input.title,
    input.description,
    input.path,
    input.image,
    input.type,
    input.noIndex,
    input.keywords,
    productKey,
    jsonLdKey,
  ]);
}
