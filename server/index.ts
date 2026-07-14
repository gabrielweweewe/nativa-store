import express from "express";
import fs from "fs";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createApiApp } from "./app";
import { getProductBySlug } from "./services/products";
import { absoluteUrl, stripHtml, truncateMeta } from "@shared/lib/seo";
import { SITE_KEYWORDS, SITE_NAME } from "@shared/const/site";
import {
  injectSeoIntoHtml,
  loadSpaHtml,
  resolvePublicBaseUrl,
} from "./lib/seoHtml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  const apiApp = createApiApp();
  app.use(apiApp);

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("/produto/:slug", async (req, res, next) => {
    try {
      const indexPath = path.join(staticPath, "index.html");
      const spaHtml =
        loadSpaHtml() ?? (fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : null);

      if (!spaHtml) {
        next();
        return;
      }

      const slug = String(req.params.slug ?? "").trim();
      const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
      const host =
        (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ||
        req.headers.host;
      const baseUrl = resolvePublicBaseUrl(host, proto);
      const product = slug ? await getProductBySlug(slug) : null;

      if (!product) {
        res
          .status(404)
          .type("html")
          .send(
            injectSeoIntoHtml(spaHtml, {
              title: `Produto não encontrado — ${SITE_NAME}`,
              description: "Este produto não está disponível na Nativa Store.",
              url: absoluteUrl(baseUrl, `/produto/${encodeURIComponent(slug)}`),
              image: absoluteUrl(baseUrl, "/images/bannerNativa.jpg"),
              noIndex: true,
            }),
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

      res
        .status(200)
        .type("html")
        .send(
          injectSeoIntoHtml(spaHtml, {
            title: `${product.name} — ${SITE_NAME}`,
            description,
            url,
            image,
            type: "product",
            keywords: `${product.name}, ${product.category}, ${SITE_KEYWORDS}`,
            product: {
              price: product.price,
              currency: "BRL",
              availability: product.inStock ? "in stock" : "out of stock",
            },
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "Product",
              name: product.name,
              description,
              image: (product.images?.length ? product.images : [product.image]).map((img) =>
                absoluteUrl(baseUrl, img),
              ),
              sku: product.sku,
              offers: {
                "@type": "Offer",
                url,
                priceCurrency: "BRL",
                price: product.price,
                availability: product.inStock
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              },
            },
          }),
        );
    } catch (error) {
      console.error("[seo] produto:", error);
      next();
    }
  });

  app.get("/sitemap.xml", async (req, res, next) => {
    try {
      // Reutiliza o handler da API montada em /api/seo
      res.redirect(301, "/api/seo/sitemap.xml");
    } catch {
      next();
    }
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
