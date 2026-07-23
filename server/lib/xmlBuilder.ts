import type { FeedProductItem } from "@shared/types/metaCatalog";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function itemXml(item: FeedProductItem): string {
  const lines = [
    "    <item>",
    `      <g:id>${escapeXml(item.id)}</g:id>`,
    `      <g:title>${cdata(item.title)}</g:title>`,
    `      <g:description>${cdata(item.description)}</g:description>`,
    `      <g:link>${escapeXml(item.link)}</g:link>`,
    `      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>`,
  ];

  for (const extra of item.additionalImageLinks) {
    lines.push(
      `      <g:additional_image_link>${escapeXml(extra)}</g:additional_image_link>`
    );
  }

  lines.push(
    `      <g:price>${escapeXml(item.price)}</g:price>`,
    `      <g:availability>${escapeXml(item.availability)}</g:availability>`,
    `      <g:condition>${escapeXml(item.condition)}</g:condition>`,
    `      <g:brand>${escapeXml(item.brand)}</g:brand>`
  );

  if (item.googleProductCategory) {
    lines.push(
      `      <g:google_product_category>${escapeXml(item.googleProductCategory)}</g:google_product_category>`
    );
  }

  if (item.productType) {
    lines.push(
      `      <g:product_type>${escapeXml(item.productType)}</g:product_type>`
    );
  }

  lines.push("    </item>");
  return lines.join("\n");
}

export function buildProductFeedXml(params: {
  title: string;
  link: string;
  description: string;
  items: FeedProductItem[];
}): string {
  const channelItems = params.items.map(itemXml).join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    `  <channel>`,
    `    <title>${escapeXml(params.title)}</title>`,
    `    <link>${escapeXml(params.link)}</link>`,
    `    <description>${escapeXml(params.description)}</description>`,
    channelItems,
    `  </channel>`,
    `</rss>`,
    ``,
  ].join("\n");
}
