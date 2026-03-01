import { Product } from "@prisma/client";

export type PlainOrderItem = {
  productId: string;
  qty: number;
};

export function normalizeQtyByRules(rawQty: number, product: Product) {
  let qty = Math.max(0, Math.floor(rawQty));
  if (qty === 0) return 0;

  if (product.minOrderQty && qty < product.minOrderQty) {
    qty = product.minOrderQty;
  }

  if (product.packSize && qty % product.packSize !== 0) {
    qty = Math.ceil(qty / product.packSize) * product.packSize;
  }

  return qty;
}

export function normalizeOrderItems(items: PlainOrderItem[], productMap: Map<string, Product>) {
  const normalized: PlainOrderItem[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;

    const qty = normalizeQtyByRules(item.qty, product);
    if (qty > 0) normalized.push({ productId: item.productId, qty });
  }

  return normalized;
}
