"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Product = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  packSize: number | null;
  minOrderQty: number | null;
  isFavorite: boolean;
};

type OrderItem = { productId: string; qty: number; nameSnapshot: string; unitSnapshot: string };
type Order = { id: string; totalQty: number; items: OrderItem[] };
type Template = { id: string; name: string; items: Array<{ productId: string; qty: number }> };
type DashboardData = {
  profile: { outletName: string; phone: string; address: string; region: string } | null;
  products: Product[];
  templates: Template[];
  lastOrder: Order | null;
};

export function OutletQuickOrder({ locale }: { locale: AppLocale }) {
  const d = getDictionary(locale);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [deliveryType, setDeliveryType] = useState<"TODAY" | "TOMORROW" | "CUSTOM">("TODAY");
  const [customDate, setCustomDate] = useState("");
  const [note, setNote] = useState("");
  const [templateName, setTemplateName] = useState("Haftalik zakas");
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/outlet/dashboard", { cache: "no-store" });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const products = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.products.filter((product) => {
      if (favoritesOnly && !product.isFavorite) return false;
      if (!q) return true;
      return product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q);
    });
  }, [data, search, favoritesOnly]);

  const totalQty = useMemo(() => Object.values(qtyMap).reduce((sum, qty) => sum + qty, 0), [qtyMap]);

  function normalizeQty(rawQty: number, product: Product) {
    let qty = Math.max(0, Math.floor(rawQty));
    if (qty === 0) return 0;
    if (product.minOrderQty && qty < product.minOrderQty) qty = product.minOrderQty;
    if (product.packSize && qty % product.packSize !== 0) qty = Math.ceil(qty / product.packSize) * product.packSize;
    return qty;
  }

  function normalizeAllQty(current: Record<string, number>) {
    if (!data) return current;
    const productMap = new Map(data.products.map((p) => [p.id, p]));
    const next: Record<string, number> = {};

    for (const [productId, qty] of Object.entries(current)) {
      const product = productMap.get(productId);
      if (!product) continue;
      const normalized = normalizeQty(qty, product);
      if (normalized > 0) next[productId] = normalized;
    }
    return next;
  }

  const setQty = (product: Product, value: number, mode: "live" | "final" = "live") => {
    const nextValue = mode === "final" ? normalizeQty(value, product) : Math.max(0, Math.floor(value));
    setQtyMap((prev) => ({ ...prev, [product.id]: nextValue }));
  };

  const items = useMemo(
    () =>
      Object.entries(qtyMap)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty })),
    [qtyMap]
  );

  async function submitQuickOrder() {
    setHint("");
    const prevMap = qtyMap;
    const normalizedMap = normalizeAllQty(qtyMap);
    setQtyMap(normalizedMap);
    const normalizedItems = Object.entries(normalizedMap).map(([productId, qty]) => ({ productId, qty }));

    if (normalizedItems.length === 0) {
      return;
    }

    setSaving(true);
    const res = await fetch("/api/outlet/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: normalizedItems,
        deliveryType,
        deliveryDate: deliveryType === "CUSTOM" ? customDate : undefined,
        note
      })
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setHint(json.error || "");
      return;
    }

    setQtyMap({});
    setNote("");
    if (JSON.stringify(prevMap) !== JSON.stringify(normalizedMap)) {
      setHint("Miqdorlar avtomatik moslashtirildi.");
    }
    await load();
  }

  async function reorderLast() {
    setSaving(true);
    const payloadItems = data?.lastOrder?.items.map((item) => ({ productId: item.productId, qty: item.qty })) || undefined;
    const res = await fetch("/api/outlet/orders/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payloadItems, deliveryType: "TODAY" })
    });
    setSaving(false);
    if (res.ok) await load();
  }

  function editLastOrder() {
    if (!data?.lastOrder) return;
    const next: Record<string, number> = {};
    data.lastOrder.items.forEach((item) => {
      next[item.productId] = item.qty;
    });
    setQtyMap(next);
  }

  async function saveTemplate() {
    const normalizedMap = normalizeAllQty(qtyMap);
    setQtyMap(normalizedMap);
    const normalizedItems = Object.entries(normalizedMap).map(([productId, qty]) => ({ productId, qty }));

    if (normalizedItems.length === 0) {
      setHint("");
      return;
    }

    const res = await fetch("/api/outlet/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName, items: normalizedItems })
    });
    if (res.ok) await load();
  }

  async function useTemplate(templateId: string) {
    const res = await fetch(`/api/outlet/templates/${templateId}/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryType: "TODAY" })
    });
    if (res.ok) await load();
  }

  async function toggleFavorite(productId: string, favorite: boolean) {
    await fetch("/api/outlet/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, favorite })
    });

    setData((prev) =>
      prev
        ? {
            ...prev,
            products: prev.products.map((product) =>
              product.id === productId ? { ...product, isFavorite: favorite } : product
            )
          }
        : prev
    );
  }

  if (loading || !data) return <div className="card">Yuklanmoqda...</div>;

  return (
    <div className="space-y-4 pb-28">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{d["outlet.title"]}</h1>
          <p className="text-sm text-slate-600">
            {data.profile?.outletName} | {data.profile?.phone} | {data.profile?.address}
          </p>
        </div>
        <Link href="/outlet/orders" className="rounded bg-slate-100 px-3 py-2 text-sm">
          {d["outlet.tracking"]}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-3 flex gap-2">
            <input placeholder={d["outlet.search"]} value={search} onChange={(e) => setSearch(e.target.value)} />
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm ${favoritesOnly ? "bg-slate-900 text-white" : "bg-slate-200"}`}
              onClick={() => setFavoritesOnly((v) => !v)}
            >
              {d["outlet.favorites"]}
            </button>
          </div>

          <div className="space-y-2">
            {products.map((product) => {
              const qty = qtyMap[product.id] || 0;
              return (
                <div key={product.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {product.unit}
                      {product.minOrderQty ? ` | min ${product.minOrderQty}` : ""}
                      {product.packSize ? ` | Quti: ${product.packSize} dona` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="rounded bg-slate-200 px-3 py-1.5 text-lg" onClick={() => setQty(product, qty - 1)}>
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={qty}
                      className="w-20 text-center text-lg font-bold"
                      onChange={(e) => setQty(product, Number(e.target.value || 0))}
                      onBlur={(e) => setQty(product, Number(e.target.value || 0), "final")}
                    />
                    <button type="button" className="rounded bg-slate-900 px-3 py-1.5 text-lg text-white" onClick={() => setQty(product, qty + 1)}>
                      +
                    </button>
                    <button type="button" className="px-2 text-xl" onClick={() => toggleFavorite(product.id, !product.isFavorite)}>
                      {product.isFavorite ? "★" : "☆"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="card space-y-2">
            <button className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={reorderLast} disabled={!data.lastOrder || saving}>
              {d["outlet.reorder"]}
            </button>
            <button className="w-full rounded bg-slate-200 px-3 py-2 text-sm" type="button" onClick={editLastOrder} disabled={!data.lastOrder}>
              {d["outlet.editLast"]}
            </button>
          </div>

          <div className="card space-y-2">
            <p className="font-semibold">{d["outlet.templates"]}</p>
            <div className="flex gap-2">
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder={d["outlet.templates"]} />
              <button className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={saveTemplate}>
                {d["outlet.createTemplate"]}
              </button>
            </div>
            <div className="space-y-2">
              {data.templates.map((template) => (
                <button key={template.id} type="button" className="w-full rounded border border-slate-200 p-2 text-left text-sm" onClick={() => useTemplate(template.id)}>
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-300 bg-white p-3">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm font-semibold">{d["outlet.total"]}: {totalQty}</p>
          <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as "TODAY" | "TOMORROW" | "CUSTOM")}>
              <option value="TODAY">{d["outlet.today"]}</option>
              <option value="TOMORROW">{d["outlet.tomorrow"]}</option>
              <option value="CUSTOM">{d["outlet.customDate"]}</option>
            </select>
            <input
              type="datetime-local"
              value={customDate}
              disabled={deliveryType !== "CUSTOM"}
              onChange={(e) => setCustomDate(e.target.value)}
            />
            <input placeholder={d["outlet.note"]} value={note} onChange={(e) => setNote(e.target.value)} />
            <button
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
              onClick={submitQuickOrder}
              disabled={saving || totalQty === 0}
              type="button"
            >
              {d["outlet.sendOrder"]}
            </button>
          </div>
        </div>
        {hint ? <p className="mx-auto mt-2 w-full max-w-6xl text-sm text-slate-600">{hint}</p> : null}
      </div>
    </div>
  );
}
