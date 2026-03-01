import { Product } from "@prisma/client";

export type PlainOrderItem = {
  productId: string;
  qty: number;
};

export function validateOrderItems(items: PlainOrderItem[], productMap: Map<string, Product>) {
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error("Mahsulot topilmadi");
    }
    if (product.minOrderQty && item.qty < product.minOrderQty) {
      throw new Error(`${product.name}: kamida ${product.minOrderQty}`);
    }
    if (product.packSize && item.qty % product.packSize !== 0) {
      throw new Error(`${product.name}: ${product.packSize} ga karrali bo'lsin`);
    }
  }
}
