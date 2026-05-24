"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type StockEntry = {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  available: number;
  total: number;
  reserved: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  stock: StockEntry[];
};

type Reservation = {
  id: string;
  status: string;
  expiresAt: string;
  quantity: number;
  product: { name: string };
  warehouse: { name: string };
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "reservations">("products");
  const router = useRouter();

  useEffect(() => {
    fetchProducts();
    fetchReservations();
  }, []);

  async function fetchProducts() {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }

  async function fetchReservations() {
    const res = await fetch("/api/reservations/all");
    if (res.ok) {
      const data = await res.json();
      setReservations(data);
    }
  }

  async function reserve(productId: string, warehouseId: string) {
    setReserving(`${productId}-${warehouseId}`);
    setError(null);
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to reserve");
      setReserving(null);
      return;
    }
    router.push(`/reservation/${data.id}`);
  }

  function getTimeLeft(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}m ${s}s`;
  }

  function getStatusColor(status: string) {
    if (status === "confirmed") return "bg-green-100 text-green-700";
    if (status === "released") return "bg-gray-100 text-gray-600";
    return "bg-yellow-100 text-yellow-700";
  }

  const pendingReservations = reservations.filter(r => r.status === "pending");
  const totalProducts = products.length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500">Loading inventory...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Allo Inventory</h1>
              <p className="text-xs text-gray-500">{totalProducts} products across 2 warehouses</p>
            </div>
          </div>
          {pendingReservations.length > 0 && (
            <button
              onClick={() => setActiveTab("reservations")}
              className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <span className="w-5 h-5 bg-yellow-500 text-white rounded-full text-xs flex items-center justify-center">
                {pendingReservations.length}
              </span>
              Active Reservations
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("products")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "products"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Products
            </button>
            <button
              onClick={() => { setActiveTab("reservations"); fetchReservations(); }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "reservations"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              My Reservations
              {pendingReservations.length > 0 && (
                <span className="bg-yellow-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingReservations.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="grid gap-5">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Product Header */}
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
                      <p className="text-sm text-gray-500 mt-0.5">{product.description}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      product.stock.some(s => s.available > 0)
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {product.stock.some(s => s.available > 0) ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>
                </div>

                {/* Stock per warehouse */}
                <div className="divide-y divide-gray-50">
                  {product.stock.map((s) => (
                    <div key={s.warehouseId} className="px-6 py-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700">{s.warehouseName}</span>
                            <span className="text-xs text-gray-400 ml-2">{s.warehouseLocation}</span>
                          </div>
                          <span className={`text-sm font-semibold ${
                            s.available === 0 ? "text-red-500" :
                            s.available <= 3 ? "text-orange-500" : "text-green-600"
                          }`}>
                            {s.available === 0 ? "Out of stock" :
                             s.available <= 3 ? `Only ${s.available} left!` :
                             `${s.available} available`}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              s.available === 0 ? "bg-red-400" :
                              s.available <= 3 ? "bg-orange-400" : "bg-green-500"
                            }`}
                            style={{ width: `${Math.max(5, (s.available / s.total) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => reserve(product.id, s.warehouseId)}
                        disabled={s.available === 0 || reserving === `${product.id}-${s.warehouseId}`}
                        className={`px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          s.available === 0
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                        }`}
                      >
                        {reserving === `${product.id}-${s.warehouseId}` ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Reserving...
                          </>
                        ) : s.available === 0 ? "Unavailable" : "🔒 Reserve"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === "reservations" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">My Reservations</h2>
              <button
                onClick={fetchReservations}
                className="text-sm text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>

            {reservations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-4xl mb-3">📦</p>
                <p className="text-gray-500 font-medium">No reservations yet</p>
                <p className="text-gray-400 text-sm mt-1">Reserve a product to see it here</p>
                <button
                  onClick={() => setActiveTab("products")}
                  className="mt-4 text-blue-600 text-sm hover:underline"
                >
                  Browse products →
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {reservations.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => router.push(`/reservation/${r.id}`)}
                    className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{r.product.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{r.warehouse.name} · Qty: {r.quantity}</p>
                      {r.status === "pending" && (
                        <p className="text-xs text-orange-500 mt-1">⏱ Expires in {getTimeLeft(r.expiresAt)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(r.status)}`}>
                        {r.status.toUpperCase()}
                      </span>
                      <span className="text-gray-400">→</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}