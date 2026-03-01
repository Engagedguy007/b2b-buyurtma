import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";

export async function GET() {
  const guard = await requireRole([UserRole.OUTLET]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const outletId = guard.session.user.id;

  const [profile, products, favorites, templates, lastOrder, history] = await Promise.all([
    prisma.outletProfile.findUnique({ where: { userId: outletId } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
    prisma.favoriteProduct.findMany({ where: { outletId } }),
    prisma.orderTemplate.findMany({
      where: { outletId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.order.findFirst({
      where: { outletId },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.order.findMany({
      where: { outletId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 15
    })
  ]);

  const favoriteSet = new Set(favorites.map((f) => f.productId));

  return NextResponse.json({
    profile,
    products: products.map((product) => ({
      ...product,
      price: product.price ? Number(product.price) : null,
      isFavorite: favoriteSet.has(product.id)
    })),
    templates,
    lastOrder,
    history
  });
}
