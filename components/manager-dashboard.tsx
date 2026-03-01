"use client";

import { useEffect, useMemo, useState } from "react";

type Courier = { id: string; name: string; email: string };

type Order = {
  id: string;
  status: string;
  deliveryDate: string;
  note: string | null;
  totalQty: number;
  rejectionReason: string | null;
  outlet: { name: string; outletProfile: { outletName: string; phone: string; address: string; region: string } | null };
  assignedCourier: Courier | null;
  items: Array<{ id: string; nameSnapshot: string; qty: number; unitSnapshot: string }>;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  isActive: boolean;
  packSize: number | null;
  minOrderQty: number | null;
};

const statuses = [
  "NEW",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY",
  "ASSIGNED",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED"
];

export function ManagerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [newProduct, setNewProduct] = useState({ name: "", sku: "", unit: "dona" });

  const load = async () => {
    const [ordersRes, productsRes, couriersRes] = await Promise.all([
      fetch("/api/manager/orders", { cache: "no-store" }),
      fetch("/api/manager/products", { cache: "no-store" }),
      fetch("/api/manager/couriers", { cache: "no-store" })
    ]);

    setOrders(await ordersRes.json());
    setProducts(await productsRes.json());
    setCouriers(await couriersRes.json());
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    return {
      newCount: orders.filter((o) => o.status === "NEW").length,
      activeCount: orders.filter((o) => !["DELIVERED", "REJECTED"].includes(o.status)).length
    };
  }, [orders]);

  const updateOrder = async (orderId: string, payload: Record<string, unknown>) => {
    await fetch(`/api/manager/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    await load();
  };

  const createProduct = async () => {
    if (!newProduct.name || !newProduct.sku) return;
    await fetch("/api/manager/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newProduct, isActive: true })
    });
    setNewProduct({ name: "", sku: "", unit: "dona" });
    await load();
  };

  const toggleProduct = async (product: Product) => {
    await fetch(`/api/manager/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !product.isActive })
    });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Manager dashboard</h1>
        <p className="text-sm text-slate-600">Yangi: {stats.newCount} | Jarayonda: {stats.activeCount}</p>
      </div>

      <div className="flex gap-2">
        <button className={`rounded px-3 py-2 text-sm ${tab === "orders" ? "bg-slate-900 text-white" : "bg-slate-200"}`} onClick={() => setTab("orders")}>
          Buyurtmalar
        </button>
        <button className={`rounded px-3 py-2 text-sm ${tab === "products" ? "bg-slate-900 text-white" : "bg-slate-200"}`} onClick={() => setTab("products")}>
          Mahsulotlar
        </button>
      </div>

      {tab === "orders" ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{order.outlet.outletProfile?.outletName || order.outlet.name}</p>
                  <p className="text-sm text-slate-600">
                    {order.outlet.outletProfile?.phone} | {order.outlet.outletProfile?.address} ({order.outlet.outletProfile?.region})
                  </p>
                </div>
                <p className="text-sm">{new Date(order.deliveryDate).toLocaleString("uz-UZ")}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select value={order.status} onChange={(e) => updateOrder(order.id, { status: e.target.value })}>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select
                  value={order.assignedCourier?.id || ""}
                  onChange={(e) =>
                    updateOrder(order.id, { status: "ASSIGNED", assignedCourierId: e.target.value || null })
                  }
                >
                  <option value="">Kurerni tanlang</option>
                  {couriers.map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name}
                    </option>
                  ))}
                </select>
                <button className="rounded bg-red-100 px-3 py-2 text-sm" onClick={() => updateOrder(order.id, { status: "REJECTED", rejectionReason: "Zaxirada yo'q" })}>
                  Rad etish
                </button>
              </div>

              <div className="rounded border border-slate-200 p-2 text-sm">
                <p className="mb-1 font-medium">Itemlar ({order.totalQty})</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {order.items.map((item) => (
                    <span key={item.id}>
                      {item.nameSnapshot}: {item.qty} {item.unitSnapshot}
                    </span>
                  ))}
                </div>
                {order.rejectionReason ? <p className="mt-2 text-red-600">Sabab: {order.rejectionReason}</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="card flex flex-wrap gap-2">
            <input placeholder="Nomi" value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} />
            <input placeholder="SKU" value={newProduct.sku} onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))} />
            <input placeholder="Birlik" value={newProduct.unit} onChange={(e) => setNewProduct((p) => ({ ...p, unit: e.target.value }))} />
            <button className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={createProduct}>
              Qo'shish
            </button>
          </div>

          {products.map((product) => (
            <div key={product.id} className="card flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-slate-600">
                  {product.sku} | {product.unit} | min {product.minOrderQty || "-"} | pack {product.packSize || "-"}
                </p>
              </div>
              <button className="rounded bg-slate-200 px-3 py-2 text-sm" onClick={() => toggleProduct(product)}>
                {product.isActive ? "O'chirish" : "Faollashtirish"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
