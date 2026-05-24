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

const PRODUCT_EMOJIS: Record<string, string> = {
  "iPhone 15 Pro": "📱",
  "Samsung Galaxy S24 Ultra": "📱",
  'MacBook Pro 14"': "💻",
  'iPad Pro 12.9"': "📱",
  "Sony WH-1000XM5": "🎧",
  "DJI Mini 4 Pro": "🚁",
  "PlayStation 5": "🎮",
  'Samsung 65" OLED TV': "📺",
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "reservations">("products");
  const [search, setSearch] = useState("");
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
    if (res.ok) setReservations(await res.json());
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
    return `${m}m ${s}s left`;
  }

  function getStatusBadge(status: string) {
    if (status === "confirmed") return "bg-green-100 text-green-700 border border-green-200";
    if (status === "released") return "bg-gray-100 text-gray-500 border border-gray-200";
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = reservations.filter(r => r.status === "pending").length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg font-medium">Loading inventory...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }} className="text-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Top row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-xl">
                🏪
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Allo Inventory</h1>
                <p className="text-purple-200 text-xs">
                  {products.length} products · 3 warehouses · {products.reduce((acc, p) => acc + p.stock.reduce((a, s) => a + s.available, 0), 0)} units available
                </p>
              </div>
            </div>
            {pendingCount > 0 && (
              <button
                onClick={() => setActiveTab("reservations")}
                className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 transition px-4 py-2 rounded-xl text-sm font-medium text-white border border-white border-opacity-30"
              >
                <span className="w-5 h-5 bg-amber-400 text-white rounded-full text-xs flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
                Active Reservations
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white text-gray-800 pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-sm placeholder-gray-400"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("products")}
              className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all ${
                activeTab === "products"
                  ? "bg-slate-50 text-purple-700"
                  : "text-purple-200 hover:text-white"
              }`}
            >
              🛍️ Products
            </button>
            <button
              onClick={() => { setActiveTab("reservations"); fetchReservations(); }}
              className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all flex items-center gap-2 ${
                activeTab === "reservations"
                  ? "bg-slate-50 text-purple-700"
                  : "text-purple-200 hover:text-white"
              }`}
            >
              📋 My Reservations
              {pendingCount > 0 && (
                <span className="bg-amber-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg">✕</button>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Showing {filteredProducts.length} of {products.length} products · Reservations held for 10 minutes
            </p>
            <div className="grid gap-4">
              {filteredProducts.map((product) => {
                const totalAvail = product.stock.reduce((a, s) => a + s.available, 0);
                const emoji = PRODUCT_EMOJIS[product.name] || "📦";
                return (
                  <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="px-6 py-5 flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-base font-semibold text-gray-900">{product.name}</h2>
                            <p className="text-sm text-gray-500 mt-0.5">{product.description}</p>
                          </div>
                          <span className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                            totalAvail > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                          }`}>
                            {totalAvail > 0 ? `${totalAvail} units` : "Sold out"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-50">
                      {product.stock.map((s, i) => (
                        <div key={s.warehouseId} className={`px-6 py-4 flex items-center gap-4 ${i !== product.stock.length - 1 ? "border-b border-gray-50" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">🏭</span>
                                <span className="text-sm font-medium text-gray-700">{s.warehouseName}</span>
                                <span className="text-xs text-gray-400">{s.warehouseLocation}</span>
                              </div>
                              <span className={`text-xs font-semibold ${
                                s.available === 0 ? "text-red-500" :
                                s.available <= 2 ? "text-red-500" :
                                s.available <= 4 ? "text-orange-500" : "text-green-600"
                              }`}>
                                {s.available === 0 ? "Out of stock" :
                                 s.available <= 2 ? `🔴 Only ${s.available} left!` :
                                 s.available <= 4 ? `🟠 ${s.available} left` :
                                 `✅ ${s.available} available`}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                  s.available === 0 ? "bg-red-300" :
                                  s.available <= 2 ? "bg-red-500" :
                                  s.available <= 4 ? "bg-orange-400" : "bg-green-500"
                                }`}
                                style={{ width: `${Math.max(3, (s.available / s.total) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => reserve(product.id, s.warehouseId)}
                            disabled={s.available === 0 || reserving === `${product.id}-${s.warehouseId}`}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                              s.available === 0
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 active:scale-95 shadow-sm"
                            }`}
                          >
                            {reserving === `${product.id}-${s.warehouseId}` ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Holding...
                              </>
                            ) : s.available === 0 ? "Unavailable" : "🔒 Reserve"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="text-gray-600 font-medium">No products found</p>
                  <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Reservations Tab */}
        {activeTab === "reservations" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">My Reservations</h2>
                <p className="text-sm text-gray-500">{reservations.length} total · Click any to manage</p>
              </div>
              <button onClick={fetchReservations} className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                🔄 Refresh
              </button>
            </div>

            {reservations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <p className="text-5xl mb-4">📦</p>
                <p className="text-gray-700 font-semibold text-lg">No reservations yet</p>
                <p className="text-gray-400 text-sm mt-1">Reserve a product to hold it for 10 minutes</p>
                <button
                  onClick={() => setActiveTab("products")}
                  className="mt-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition"
                >
                  Browse Products →
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {reservations.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => router.push(`/reservation/${r.id}`)}
                    className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between cursor-pointer hover:border-purple-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center text-lg">
                        {PRODUCT_EMOJIS[r.product.name] || "📦"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{r.product.name}</p>
                        <p className="text-sm text-gray-500">{r.warehouse.name} · Qty: {r.quantity}</p>
                        {r.status === "pending" && (
                          <p className="text-xs text-orange-500 mt-0.5 font-medium">⏱ {getTimeLeft(r.expiresAt)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusBadge(r.status)}`}>
                        {r.status.toUpperCase()}
                      </span>
                      <span className="text-gray-300 group-hover:text-purple-400 transition text-lg">→</span>
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