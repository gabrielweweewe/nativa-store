import { Router, type Request, type Response } from "express";
import { absoluteUrl, stripHtml, truncateMeta } from "@shared/lib/seo";
import { SITE_KEYWORDS, SITE_NAME } from "@shared/const/site";
import { getProductBySlug, listProducts } from "../services/products";
import {
  buildStandaloneOgHtml,
  injectSeoIntoHtml,
  isSocialCrawler,
  loadSpaHtmlAsync,
  resolvePublicBaseUrl,
  type InjectMetaOptions,
} from "../lib/seoHtml";

const router = Router();

function requestBaseUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  const host =
    (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ||
    req.headers.host;
  return resolvePublicBaseUrl(host, proto);
}

async function sendSeoHtml(req: Request, res: Response, options: InjectMetaOptions, status = 200) {
  const ua = req.headers["user-agent"];
  const crawler = isSocialCrawler(typeof ua === "string" ? ua : undefined);
  const spaHtml = await loadSpaHtmlAsync(requestBaseUrl(req));

  // Sempre preferir o SPA com OG no <head> (WhatsApp/Facebook leem só as meta tags).
  // HTML mínimo era cacheado no CDN sem Vary e quebrava a loja no navegador.
  if (!spaHtml) {
    res
      .status(status)
      .setHeader("Cache-Control", "private, no-store")
      .setHeader("Vary", "User-Agent")
      .type("html")
      .send(
        crawler
          ? buildStandaloneOgHtml(options)
          : buildStandaloneOgHtml(options).replace(
              "</body>",
              `<p><a href="/">Abrir a Nativa Store</a></p>
    <script>
      // Evita ficar na página de fallback: vai à home (SPA) e o usuário navega de novo.
      setTimeout(function () { location.replace("/"); }, 100);
    </script>
  </body>`,
            ),
      );
    return;
  }

  res
    .status(status)
    .setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")
    .setHeader("Vary", "User-Agent")
    .type("html")
    .send(injectSeoIntoHtml(spaHtml, options));
}

router.get("/produto/:slug", async (req, res) => {
  const slug = String(req.params.slug ?? "").trim();
  const baseUrl = requestBaseUrl(req);

  try {
    const product = slug ? await getProductBySlug(slug) : null;

    if (!product) {
      await sendSeoHtml(
        req,
        res,
        {
          title: `Produto não encontrado — ${SITE_NAME}`,
          description: "Este produto não está disponível na Nativa Store.",
          url: absoluteUrl(baseUrl, `/produto/${encodeURIComponent(slug)}`),
          image: absoluteUrl(baseUrl, "/images/bannerNativa.jpg"),
          type: "website",
          noIndex: true,
        },
        404,
      );
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

    await sendSeoHtml(req, res, {
      title,
      description,
      url,
      image,
      type: "website",
      keywords: `${product.name}, ${product.category}, ${SITE_KEYWORDS}`,
      product: {
        price: product.price,
        currency: "BRL",
        availability: product.inStock ? "in stock" : "out of stock",
        brand: SITE_NAME,
      },
      jsonLd,
    });
  } catch (error) {
    console.error("[seo] falha ao montar meta do produto:", error);
    // Em erro, tenta o SPA sem meta específica em vez de HTML mínimo (quebra a loja).
    const spaHtml = await loadSpaHtmlAsync(baseUrl);
    if (spaHtml) {
      res.status(200).type("html").setHeader("Cache-Control", "no-store").send(spaHtml);
      return;
    }
    res
      .status(200)
      .type("html")
      .setHeader("Cache-Control", "private, no-store")
      .send(
        buildStandaloneOgHtml({
          title: SITE_NAME,
          description: "Moda artesanal brasileira com alma.",
          url: absoluteUrl(baseUrl, `/produto/${encodeURIComponent(slug)}`),
          image: absoluteUrl(baseUrl, "/images/bannerNativa.jpg"),
        }),
      );
  }
});

router.get("/sitemap.xml", async (req, res) => {
  const baseUrl = requestBaseUrl(req).replace(/\/$/, "");

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
