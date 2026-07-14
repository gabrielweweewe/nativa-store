export type OrderEmailParams = Record<string, unknown> & {
  ITEMS?: Array<{
    name?: string;
    quantity?: number;
    price?: string;
    size?: string;
    color?: string;
  }>;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildItemsHtml(items: OrderEmailParams["ITEMS"]): string {
  if (!items?.length) return "<li>Nenhum item</li>";
  return items
    .map(item => {
      const label = [
        `${item.quantity ?? 1}x ${item.name ?? "Item"}`,
        item.size ? `Tam. ${item.size}` : "",
        item.color ? item.color : "",
        item.price ?? "",
      ]
        .filter(Boolean)
        .join(" — ");
      return `<li>${escapeHtml(label)}</li>`;
    })
    .join("");
}

/** Substitui {{VAR}} e monta {{ITEMS_HTML}} a partir dos params do pedido. */
export function renderStoreEmailTemplate(
  template: string,
  params: OrderEmailParams
): string {
  const values: Record<string, string> = {
    ITEMS_HTML: buildItemsHtml(params.ITEMS),
  };
  for (const [key, value] of Object.entries(params)) {
    if (key === "ITEMS") continue;
    values[key] = value == null ? "" : String(value);
  }
  return template.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return values[key] ?? "";
  });
}
