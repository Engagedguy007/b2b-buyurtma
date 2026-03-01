"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  isActive: boolean;
  packSize: number | null;
  minOrderQty: number | null;
  isFavorite: boolean;
};

type OrderItem = { productId: string; qty: number; nameSnapshot: string; unitSnapshot: string };
type Order = {
  id: string;
  status: string;
  createdAt: string;
  deliveryDate: string;
  totalQty: number;
  items: OrderItem[];
};

type Template = {
  id: string;
  name: string;
  items: Array<{ productId: string; qty: number; product: { name: string; unit: string } }>;
};

type DashboardData = {
  profile: { outletName: string; phone: string; address: string; region: string } | null;
  products: Product[];
  templates: Template[];
  lastOrder: Order | null;
  history: Order[];
};

export function OutletQuickOrder() {
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
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/outlet/dashboard", { cache: "no-store" });
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

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

  const setQty = (product: Product, value: number) => {
    const clamped = Math.max(0, value);
    setQtyMap((prev) => ({ ...prev, [product.id]: clamped }));
  };

  const buildItems = () =>
    Object.entries(qtyMap)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => ({ productId, qty }));

  const submitQuickOrder = async () => {
    setError("");
    const items = buildItems();
    if (items.length === 0) {
      setError("Kamida bitta mahsulot tanlang");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/outlet/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        deliveryType,
        deliveryDate: deliveryType === "CUSTOM" ? customDate : undefined,
        note
      })
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }

    setQtyMap({});
    setNote("");
    await load();
  };

  const reorderLast = async () => {
    setSaving(true);
    const items = data?.lastOrder?.items.map((item) => ({ productId: item.productId, qty: item.qty })) || undefined;
    const res = await fetch("/api/outlet/orders/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, deliveryType: "TODAY" })
    });
    setSaving(false);
    if (res.ok) await load();
  };

  const applyLastOrderToEditor = () => {
    if (!data?.lastOrder) return;
    const next: Record<string, number> = {};
    data.lastOrder.items.forEach((item) => {
      next[item.productId] = item.qty;
    });
    setQtyMap(next);
  };

  const saveTemplate = async () => {
    const items = buildItems();
    if (items.length === 0) {
      setError("Shablon uchun mahsulot tanlang");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/outlet/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName, items })
    });
    setSaving(false);
    if (res.ok) await load();
  };

  const useTemplate = async (templateId: string) => {
    setSaving(true);
    const res = await fetch(`/api/outlet/templates/${templateId}/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryType: "TODAY" })
    });
    setSaving(false);
    if (res.ok) await load();
  };

  const toggleFavorite = async (productId: string, favorite: boolean) => {
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
  };

  if (loading || !data) {
    return <div className="card">Yuklanmoqda...</div>;
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="card">
        <h1 className="text-xl font-bold">Tez zakas</h1>
        <p className="text-sm text-slate-600">
          {data.profile?.outletName} | {data.profile?.phone} | {data.profile?.address}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <div className="mb-3 flex gap-2">
            <input placeholder="Qidiruv..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm ${favoritesOnly ? "bg-slate-900 text-white" : "bg-slate-200"}`}
              onClick={() => setFavoritesOnly((v) => !v)}
            >
              Sevimlilar
            </button>
          </div>

          <div className="space-y-2">
            {products.map((product) => {
              const qty = qtyMap[product.id] || 0;
              return (
                <div key={product.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-xs text-slate-500">
                        {product.sku} | {product.unit}
                        {product.minOrderQty ? ` | min ${product.minOrderQty}` : ""}
                        {product.packSize ? ` | pack ${product.packSize}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-lg"
                      onClick={() => toggleFavorite(product.id, !product.isFavorite)}
                      title="Sevimli"
                    >
                      {product.isFavorite ? "★" : "☆"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="rounded bg-slate-200 px-3 py-1" onClick={() => setQty(product, qty - 1)} type="button">
                      -
                    </button>
                    <div className="min-w-12 text-center text-lg font-bold">{qty}</div>
                    <button className="rounded bg-slate-900 px-3 py-1 text-white" onClick={() => setQty(product, qty + 1)} type="button">
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card space-y-2">
            <p className="font-semibold">Qayta buyurtma</p>
            <button onClick={reorderLast} disabled={!data.lastOrder || saving} className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white" type="button">
              Oxirgi buyurtmani takrorlash
            </button>
            <button onClick={applyLastOrderToEditor} disabled={!data.lastOrder} className="w-full rounded bg-slate-200 px-3 py-2 text-sm" type="button">
              Oxirgi buyurtmani tahrirlashga yuklash
            </button>
          </div>

          <div className="card space-y-2">
            <p className="font-semibold">Shablonlar</p>
            <div className="flex gap-2">
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Shablon nomi" />
              <button className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={saveTemplate}>
                Saqlash
              </button>
            </div>
            <div className="space-y-2">
              {data.templates.map((template) => (
                <div key={template.id} className="rounded border border-slate-200 p-2 text-sm">
                  <p className="font-medium">{template.name}</p>
                  <p className="text-xs text-slate-500">{template.items.length} ta item</p>
                  <button className="mt-2 rounded bg-slate-200 px-2 py-1 text-xs" type="button" onClick={() => useTemplate(template.id)}>
                    1 bosishda zakas
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="mb-2 font-semibold">Buyurtmalar tarixi</p>
            <div className="max-h-72 space-y-2 overflow-auto">
              {data.history.map((order) => (
                <div key={order.id} className="rounded border border-slate-200 p-2 text-sm">
                  <p className="font-medium">{new Date(order.createdAt).toLocaleDateString("uz-UZ")} | {order.status}</p>
                  <p className="text-xs text-slate-500">Jami: {order.totalQty}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-300 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold">Jami: {totalQty} dona</p>
          <div className="grid flex-1 gap-2 md:grid-cols-4">
            <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as "TODAY" | "TOMORROW" | "CUSTOM")}>
              <option value="TODAY">Bugun</option>
              <option value="TOMORROW">Ertaga</option>
              <option value="CUSTOM">Aniq sana</option>
            </select>
            <input
              type="datetime-local"
              value={customDate}
              disabled={deliveryType !== "CUSTOM"}
              onChange={(e) => setCustomDate(e.target.value)}
            />
            <input placeholder="Izoh (ixtiyoriy)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white" onClick={submitQuickOrder} disabled={saving} type="button">
              Zakas berish
            </button>
          </div>
        </div>
        {error ? <p className="mx-auto mt-2 w-full max-w-6xl text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
