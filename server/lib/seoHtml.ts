import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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
import { absoluteUrl, escapeHtmlAttr, normalizeBaseUrl, truncateMeta } from "@shared/lib/seo";

export type InjectMetaOptions = {
  title: string;
  description: string;
  url: string;
  image: string;
  /** WhatsApp/Facebook lidam melhor com website do que product */
  type?: "website" | "product" | "article";
  noIndex?: boolean;
  keywords?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  product?: {
    price: number;
    currency?: string;
    availability?: string;
    brand?: string;
  };
};

export function isSocialCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|pinterest|googlebot|bingbot|duckduckbot|embedly|quora link preview|outbrain|vkshare|w3c_validator|redditbot|applebot|ia_archiver/i.test(
    userAgent,
  );
}

function resolveSpaHtmlPath(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    // Vercel includeFiles: api/spa.html (ao lado do bundle api/index.js)
    path.join(here, "spa.html"),
    path.join(process.cwd(), "spa.html"),
    path.join(process.cwd(), "api", "spa.html"),
    path.join(process.cwd(), "dist", "public", "index.html"),
    path.join(process.cwd(), "public", "index.html"),
    path.join(here, "..", "public", "index.html"),
    path.join(here, "..", "dist", "public", "index.html"),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function loadSpaHtml(): string | null {
  const filePath = resolveSpaHtmlPath();
  if (!filePath) return null;
  return fs.readFileSync(filePath, "utf8");
}

/** Busca o index.html estático do deploy (fallback no Vercel). */
export async function loadSpaHtmlAsync(baseUrl: string): Promise<string | null> {
  const local = loadSpaHtml();
  if (local) return local;

  if (!baseUrl) return null;

  try {
    const origin = baseUrl.replace(/\/$/, "");
    const response = await fetch(`${origin}/index.html`, {
      headers: { Accept: "text/html" },
      redirect: "follow",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function metaName(name: string, content: string) {
  return `<meta name="${escapeHtmlAttr(name)}" content="${escapeHtmlAttr(content)}" />`;
}

function metaProperty(property: string, content: string) {
  return `<meta property="${escapeHtmlAttr(property)}" content="${escapeHtmlAttr(content)}" />`;
}

export function buildHeadBlock(options: InjectMetaOptions): string {
  const title = options.title;
  const description = truncateMeta(options.description);
  const image = options.image;
  // website = preview mais confiável no WhatsApp
  const type = options.type ?? "website";
  const robots = options.noIndex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  const tags = [
    `<title>${escapeHtmlAttr(title)}</title>`,
    metaName("description", description),
    metaName("robots", robots),
    metaName("googlebot", options.noIndex ? "noindex, nofollow" : "index, follow"),
    metaName("theme-color", SITE_THEME_COLOR),
    metaName("author", SITE_NAME),
    `<link rel="canonical" href="${escapeHtmlAttr(options.url)}" />`,
    metaProperty("og:locale", SITE_LOCALE),
    metaProperty("og:type", type === "product" ? "website" : type),
    metaProperty("og:site_name", SITE_NAME),
    metaProperty("og:title", title),
    metaProperty("og:description", description),
    metaProperty("og:url", options.url),
    metaProperty("og:image", image),
    metaProperty("og:image:secure_url", image),
    metaProperty("og:image:alt", title),
    metaName("twitter:card", "summary_large_image"),
    metaName("twitter:site", SITE_TWITTER_HANDLE),
    metaName("twitter:title", title),
    metaName("twitter:description", description),
    metaName("twitter:image", image),
  ];

  if (image.startsWith("https://")) {
    const path = image.split("?")[0]?.toLowerCase() ?? "";
    const mime = path.endsWith(".png")
      ? "image/png"
      : path.endsWith(".webp")
        ? "image/webp"
        : path.endsWith(".gif")
          ? "image/gif"
          : "image/jpeg";
    tags.push(metaProperty("og:image:type", mime));
  }

  if (options.keywords) {
    tags.push(metaName("keywords", options.keywords));
  }

  if (options.product) {
    tags.push(metaProperty("product:price:amount", String(options.product.price)));
    tags.push(metaProperty("product:price:currency", options.product.currency ?? "BRL"));
    tags.push(
      metaProperty("product:availability", options.product.availability ?? "in stock"),
    );
    tags.push(metaProperty("product:brand", options.product.brand ?? SITE_NAME));
  }

  if (options.jsonLd) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(options.jsonLd).replace(/</g, "\\u003c")}</script>`,
    );
  }

  return tags.join("\n    ");
}

/** HTML mínimo só com OG — fallback para crawlers quando o SPA não carrega. */
export function buildStandaloneOgHtml(options: InjectMetaOptions): string {
  const block = buildHeadBlock(options);
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${block}
  </head>
  <body>
    <article>
      <h1>${escapeHtmlAttr(options.title)}</h1>
      <p>${escapeHtmlAttr(truncateMeta(options.description))}</p>
      <p><a href="${escapeHtmlAttr(options.url)}">${escapeHtmlAttr(options.url)}</a></p>
    </article>
  </body>
</html>`;
}

/**
 * Substitui/insere bloco de SEO no HTML do SPA.
 */
export function injectSeoIntoHtml(html: string, options: InjectMetaOptions): string {
  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']robots["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']googlebot["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']keywords["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']product:[^"']+["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");

  const block = buildHeadBlock(options);
  if (/<\/head>/i.test(cleaned)) {
    return cleaned.replace(/<\/head>/i, `    ${block}\n  </head>`);
  }
  return `${block}\n${cleaned}`;
}

export function defaultSiteMeta(baseUrl: string): InjectMetaOptions {
  return {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: baseUrl.replace(/\/$/, "") + "/",
    image: absoluteUrl(baseUrl, SITE_OG_IMAGE_PATH),
    type: "website",
  };
}

export function resolvePublicBaseUrl(reqHost?: string | null, proto?: string | null): string {
  const fromEnv = (process.env.APP_URL || process.env.VITE_APP_URL || "").trim();
  if (fromEnv) {
    return normalizeBaseUrl(fromEnv);
  }
  if (reqHost) {
    const scheme = proto === "http" ? "http" : "https";
    return `${scheme}://${reqHost}`;
  }
  return "";
}

export { SITE_LOGO_PATH, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION };
