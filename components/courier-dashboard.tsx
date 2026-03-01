"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  status: string;
  deliveryDate: string;
  items: Array<{ id: string; nameSnapshot: string; qty: number; unitSnapshot: string }>;
  outlet: { outletProfile: { outletName: string; phone: string; address: string } | null };
};

export function CourierDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);

  const load = async () => {
    const res = await fetch("/api/courier/orders", { cache: "no-store" });
    setOrders(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (orderId: string, status: "PICKED_UP" | "DELIVERED") => {
    await fetch(`/api/courier/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="card">
        <h1 className="text-xl font-bold">Kurer buyurtmalari</h1>
      </div>

      {orders.map((order) => (
        <div key={order.id} className="card space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{order.outlet.outletProfile?.outletName || "Shahobcha"}</p>
            <p className="text-sm">{new Date(order.deliveryDate).toLocaleString("uz-UZ")}</p>
          </div>

          <p className="text-sm text-slate-600">{order.outlet.outletProfile?.address}</p>
          <a className="text-sm font-semibold text-blue-700" href={`tel:${order.outlet.outletProfile?.phone || ""}`}>
            Qo'ng'iroq qilish
          </a>

          <div className="rounded border border-slate-200 p-2 text-sm">
            {order.items.map((item) => (
              <p key={item.id}>
                {item.nameSnapshot}: {item.qty} {item.unitSnapshot}
              </p>
            ))}
          </div>

          <div className="flex gap-2">
            <button className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => updateStatus(order.id, "PICKED_UP")}>
              PICKED_UP
            </button>
            <button className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => updateStatus(order.id, "DELIVERED")}>
              DELIVERED
            </button>
            <span className="rounded bg-slate-100 px-3 py-2 text-sm">{order.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
