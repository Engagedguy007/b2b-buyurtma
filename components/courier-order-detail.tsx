"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Order = {
  id: string;
  status: string;
  deliveryDate: string;
  note: string | null;
  items: Array<{ id: string; nameSnapshot: string; qty: number; unitSnapshot: string }>;
  outlet: { outletProfile: { outletName: string; phone: string; address: string } | null };
};

export function CourierOrderDetail({ orderId, locale }: { orderId: string; locale: AppLocale }) {
  const d = getDictionary(locale);
  const [order, setOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/courier/orders/${orderId}`, { cache: "no-store" });
    if (!res.ok) return;
    setOrder(await res.json());
  }

  useEffect(() => {
    load();
  }, [orderId]);

  const actions = useMemo(() => {
    if (!order) return { canPickUp: false, canOnWay: false, canDelivered: false };
    return {
      canPickUp: ["ASSIGNED", "READY"].includes(order.status),
      canOnWay: order.status === "PICKED_UP",
      canDelivered: order.status === "OUT_FOR_DELIVERY"
    };
  }, [order]);

  async function setStatus(status: "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED") {
    if (!order) return;
    setSaving(true);
    const res = await fetch(`/api/courier/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    setSaving(false);
    if (res.ok) await load();
  }

  if (!order) return <div className="card">Yuklanmoqda...</div>;

  const phone = order.outlet.outletProfile?.phone || "";
  const address = order.outlet.outletProfile?.address || "";
  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;

  return (
    <div className="space-y-3 pb-32">
      <div className="card space-y-2">
        <Link href="/courier/orders" className="text-sm text-slate-600">← Back</Link>
        <h1 className="text-xl font-bold">{d["courier.detailTitle"]}</h1>
        <p className="text-sm">{order.outlet.outletProfile?.outletName || "Outlet"}</p>
        <p className="text-sm text-slate-600">{address}</p>
        <div className="flex gap-3 text-sm">
          <a href={`tel:${phone}`} className="rounded bg-slate-100 px-3 py-2">{d["courier.call"]}</a>
          <a href={mapUrl} target="_blank" rel="noreferrer" className="rounded bg-slate-100 px-3 py-2">{d["courier.map"]}</a>
        </div>
      </div>

      <div className="card text-sm">
        <p className="mb-2">{new Date(order.deliveryDate).toLocaleString("uz-UZ")}</p>
        {order.note ? <p className="mb-2">Note: {order.note}</p> : null}
        {order.items.map((item) => (
          <p key={item.id}>
            {item.nameSnapshot}: {item.qty} {item.unitSnapshot}
          </p>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-300 bg-white p-3">
        <div className="mx-auto grid w-full max-w-6xl gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setStatus("PICKED_UP")}
            disabled={!actions.canPickUp || saving}
            className="rounded-md bg-slate-900 px-4 py-3 text-sm font-bold text-white"
          >
            {d["courier.accept"]}
          </button>
          <button
            type="button"
            onClick={() => setStatus("OUT_FOR_DELIVERY")}
            disabled={!actions.canOnWay || saving}
            className="rounded-md bg-amber-600 px-4 py-3 text-sm font-bold text-white"
          >
            {d["courier.onway"]}
          </button>
          <button
            type="button"
            onClick={() => setStatus("DELIVERED")}
            disabled={!actions.canDelivered || saving}
            className="rounded-md bg-emerald-600 px-4 py-3 text-sm font-bold text-white"
          >
            {d["courier.delivered"]}
          </button>
        </div>
      </div>
    </div>
  );
}
