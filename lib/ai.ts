import { prisma } from "@/lib/prisma";

type LatLng = { lat: number; lng: number };

function parseGeo(geo?: string | null): LatLng | null {
  if (!geo) return null;
  const [latRaw, lngRaw] = geo.split(",").map((s) => s.trim());
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function haversine(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}

export async function getSuggestedOrder(outletId: string, companyId: string) {
  const fromDate = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { companyId, outletId, createdAt: { gte: fromDate }, status: { not: "REJECTED" } },
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });

  const todayWeekday = new Date().getDay();
  const weekdayOrders = orders.filter((o) => o.createdAt.getDay() === todayWeekday);

  const weekdayMap = new Map<string, { sum: number; count: number }>();
  for (const order of weekdayOrders) {
    for (const item of order.items) {
      const prev = weekdayMap.get(item.productId) || { sum: 0, count: 0 };
      weekdayMap.set(item.productId, { sum: prev.sum + item.qty, count: prev.count + 1 });
    }
  }

  const recentByProduct = new Map<string, number[]>();
  for (const order of orders) {
    for (const item of order.items) {
      const list = recentByProduct.get(item.productId) || [];
      if (list.length < 3) list.push(item.qty);
      recentByProduct.set(item.productId, list);
    }
  }

  const suggestions: Array<{ productId: string; qty: number }> = [];
  for (const [productId, values] of recentByProduct.entries()) {
    const weekday = weekdayMap.get(productId);
    const weekdayAvg = weekday ? weekday.sum / Math.max(1, weekday.count) : 0;
    const movingAvg = values.reduce((a, b) => a + b, 0) / values.length;
    const blended = Math.max(0, Math.round(weekdayAvg * 0.7 + movingAvg * 0.3));
    if (blended > 0) suggestions.push({ productId, qty: blended });
  }

  const top = suggestions.sort((a, b) => b.qty - a.qty).slice(0, 12);
  const products = await prisma.product.findMany({
    where: { companyId, id: { in: top.map((s) => s.productId) }, isActive: true }
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return top
    .map((s) => {
      const p = productMap.get(s.productId);
      if (!p) return null;
      return { productId: p.id, name: p.name, unit: p.unit, qty: s.qty, packSize: p.packSize, minOrderQty: p.minOrderQty };
    })
    .filter(Boolean);
}

export async function forecastDemand(companyId: string, days = 7) {
  const lookbackDays = 56;
  const fromDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { companyId, createdAt: { gte: fromDate }, status: { not: "REJECTED" } },
    include: { items: true },
    orderBy: { createdAt: "asc" }
  });

  const products = await prisma.product.findMany({ where: { companyId, isActive: true }, orderBy: { createdAt: "desc" }, take: 12 });
  const dayKeys: string[] = [];
  for (let i = lookbackDays - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  const perProductByDay = new Map<string, Map<string, number>>();
  for (const product of products) perProductByDay.set(product.id, new Map(dayKeys.map((d) => [d, 0])));

  for (const order of orders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    for (const item of order.items) {
      const map = perProductByDay.get(item.productId);
      if (!map) continue;
      map.set(day, (map.get(day) || 0) + item.qty);
    }
  }

  const result = products.map((product) => {
    const values = dayKeys.map((d) => perProductByDay.get(product.id)?.get(d) || 0);
    const ma7 = values.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const recent3 = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const prev3 = values.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    const trend = recent3 - prev3;

    const points: Array<{ date: string; qty: number }> = [];
    for (let i = 1; i <= days; i += 1) {
      const forecastDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      const qty = Math.max(0, Math.round(ma7 + trend * (i / days)));
      points.push({ date: forecastDate.toISOString().slice(0, 10), qty });
    }
    return { productId: product.id, productName: product.name, points };
  });

  return result;
}

type RouteOrder = {
  id: string;
  deliveryDate: Date;
  outlet: { outletProfile: { region: string; geo: string | null } | null };
};

export function optimizeCourierRoute(orders: RouteOrder[]) {
  const groups = new Map<string, RouteOrder[]>();
  for (const order of orders) {
    const region = order.outlet.outletProfile?.region || "Boshqa";
    const list = groups.get(region) || [];
    list.push(order);
    groups.set(region, list);
  }

  const sortedRegions = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
  const optimized: RouteOrder[] = [];

  for (const region of sortedRegions) {
    const regionOrders = [...(groups.get(region) || [])];
    const coords = regionOrders.map((o) => ({ order: o, point: parseGeo(o.outlet.outletProfile?.geo) }));
    const withGeo = coords.filter((c) => c.point) as Array<{ order: RouteOrder; point: LatLng }>;
    const withoutGeo = coords.filter((c) => !c.point).map((c) => c.order).sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime());

    if (withGeo.length === 0) {
      optimized.push(...withoutGeo);
      continue;
    }

    const remaining = [...withGeo];
    remaining.sort((a, b) => a.order.deliveryDate.getTime() - b.order.deliveryDate.getTime());
    const first = remaining.shift()!;
    optimized.push(first.order);
    let current = first.point;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < remaining.length; i += 1) {
        const dist = haversine(current, remaining[i].point);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestIdx = i;
        }
      }
      const next = remaining.splice(nearestIdx, 1)[0];
      optimized.push(next.order);
      current = next.point;
    }

    optimized.push(...withoutGeo);
  }

  return optimized.map((order, index) => ({ orderId: order.id, stop: index + 1 }));
}
