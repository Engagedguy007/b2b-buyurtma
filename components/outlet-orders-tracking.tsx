"use client";

import { useEffect, useState } from "react";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Order = {
  id: string;
  status: string;
  createdAt: string;
  deliveryDate: string;
  totalQty: number;
  note: string | null;
  items: Array<{ id: string; nameSnapshot: string; qty: number; unitSnapshot: string }>;
};

const stages = ["accepted", "preparing", "onway", "delivered"] as const;

function completedStages(status: string) {
  const map: Record<string, Set<(typeof stages)[number]>> = {
    NEW: new Set(),
    CONFIRMED: new Set(["accepted"]),
    IN_PRODUCTION: new Set(["accepted", "preparing"]),
    READY: new Set(["accepted", "preparing"]),
    ASSIGNED: new Set(["accepted", "preparing"]),
    PICKED_UP: new Set(["accepted", "preparing"]),
    OUT_FOR_DELIVERY: new Set(["accepted", "preparing", "onway"]),
    DELIVERED: new Set(["accepted", "preparing", "onway", "delivered"]),
    REJECTED: new Set()
  };

  return map[status] || new Set<(typeof stages)[number]>();
}

export function OutletOrdersTracking({ locale }: { locale: AppLocale }) {
  const d = getDictionary(locale);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/outlet/orders", { cache: "no-store" });
    const json = await res.json();
    setOrders(json);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div className="card">Yuklanmoqda...</div>;

  return (
    <div className="space-y-3">
      <div className="card flex items-center justify-between">
        <h1 className="text-xl font-bold">{d["outlet.tracking"]}</h1>
        <button type="button" onClick={load} className="rounded bg-slate-200 px-3 py-2 text-sm">
          Refresh
        </button>
      </div>

      {orders.map((order) => {
        const completed = completedStages(order.status);
        return (
          <div key={order.id} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">#{order.id.slice(-6)} | {new Date(order.createdAt).toLocaleString("uz-UZ")}</p>
              <p className="text-sm">{order.totalQty} dona</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-4">
              <div className={`rounded border p-2 text-sm ${completed.has("accepted") ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
                {d["tracking.accepted"]}
              </div>
              <div className={`rounded border p-2 text-sm ${completed.has("preparing") ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
                {d["tracking.preparing"]}
              </div>
              <div className={`rounded border p-2 text-sm ${completed.has("onway") ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
                {d["tracking.onway"]}
              </div>
              <div className={`rounded border p-2 text-sm ${completed.has("delivered") ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
                {d["tracking.delivered"]}
              </div>
            </div>

            <div className="rounded border border-slate-200 p-2 text-sm">
              {order.items.map((item) => (
                <p key={item.id}>
                  {item.nameSnapshot}: {item.qty} {item.unitSnapshot}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
