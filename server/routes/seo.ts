import { Router } from "express";
import { absoluteUrl, stripHtml, truncateMeta } from "@shared/lib/seo";
import { SITE_KEYWORDS, SITE_NAME } from "@shared/const/site";
import { getProductBySlug, listProducts } from "../services/products";
import {
  injectSeoIntoHtml,
  loadSpaHtml,
  resolvePublicBaseUrl,
} from "../lib/seoHtml";

const router = Router();

router.get("/produto/:slug", async (req, res) => {
  const slug = String(req.params.slug ?? "").trim();
  const spaHtml = loadSpaHtml();

  if (!spaHtml) {
    res.status(503).type("text/plain").send("SPA HTML indisponível para injeção de SEO");
    return;
  }

  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  const host =
    (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ||
    req.headers.host;
  const baseUrl = resolvePublicBaseUrl(host, proto);

  try {
    const product = slug ? await getProductBySlug(slug) : null;

    if (!product) {
      const html = injectSeoIntoHtml(spaHtml, {
        title: `Produto não encontrado — ${SITE_NAME}`,
        description: "Este produto não está disponível na Nativa Store.",
        url: absoluteUrl(baseUrl, `/produto/${encodeURIComponent(slug)}`),
        image: absoluteUrl(baseUrl, "/images/bannerNativa.jpg"),
        type: "website",
        noIndex: true,
      });
      res.status(404).type("html").send(html);
      return;
    }

    const description = truncateMeta(
      stripHtml(product.shortDescription || product.description) || product.name,
    );
    const image = absoluteUrl(
      baseUrl,
      product.image || product.images[0] || "/images/bannerNativa.jpg",
    );
    const url = absoluteUrl(baseUrl, `/produto/${product.slug}`);
    const title = `${product.name} — ${SITE_NAME}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description,
      image: (product.images?.length ? product.images : [product.image]).map((img) =>
        absoluteUrl(baseUrl, img),
      ),
      sku: product.sku,
      category: product.category,
      brand: { "@type": "Brand", name: SITE_NAME },
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "BRL",
        price: product.price,
        availability: product.inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    };

    const html = injectSeoIntoHtml(spaHtml, {
      title,
      description,
      url,
      image,
      type: "product",
      keywords: `${product.name}, ${product.category}, ${SITE_KEYWORDS}`,
      product: {
        price: product.price,
        currency: "BRL",
        availability: product.inStock ? "in stock" : "out of stock",
        brand: SITE_NAME,
      },
      jsonLd,
    });

    res
      .status(200)
      .setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
      .type("html")
      .send(html);
  } catch (error) {
    console.error("[seo] falha ao montar meta do produto:", error);
    res.status(200).type("html").send(spaHtml);
  }
});

router.get("/sitemap.xml", async (req, res) => {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  const host =
    (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ||
    req.headers.host;
  const baseUrl = resolvePublicBaseUrl(host, proto).replace(/\/$/, "");

  try {
    const products = await listProducts();
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${baseUrl}/`, priority: "1.0", changefreq: "daily" },
      ...products.map((product) => ({
        loc: `${baseUrl}/produto/${product.slug}`,
        priority: "0.8",
        changefreq: "weekly",
      })),
    ];

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

    res
      .status(200)
      .type("application/xml")
      .setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
      .send(body);
  } catch (error) {
    console.error("[seo] sitemap:", error);
    res.status(500).type("text/plain").send("Erro ao gerar sitemap");
  }
});

export default router;
