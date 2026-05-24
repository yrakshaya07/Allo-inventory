"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type StockEntry = {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  available: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  stock: StockEntry[];
};

function StockBar({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const color =
    available === 0
      ? "bg-red-400"
      : pct < 25
      ? "bg-amber-400"
      : "bg-emerald-500";
  return (
    <div className="mt-1.5 h-1 w-full rounded-full bg-gray-100">
      <div
        className={`h-1 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StockBadge({ available }: { available: number }) {
  if (available === 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-200">
        Out of stock
      </span>
    );
  if (available <= 4)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
        Only {available} left
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      {available} available
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="mb-1 h-5 w-48 rounded bg-gray-100" />
      <div className="mb-5 h-3.5 w-72 rounded bg-gray-100" />
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-gray-200" />
              <div className="h-3 w-20 rounded bg-gray-100" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">
              Allo Inventory
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {loading ? "—" : `${products.length} products`}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Products
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Reserve units before checkout — holds last 10 minutes.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto shrink-0 text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Product list */}
        <div className="space-y-4">
          {loading
            ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
            : products.map((product) => {
                const totalAvailable = product.stock.reduce(
                  (s, e) => s + e.available,
                  0
                );
                const totalUnits = product.stock.reduce(
                  (s, e) => s + e.available,
                  0
                );
                const overallStatus =
                  totalAvailable === 0
                    ? "out"
                    : totalAvailable <= 4
                    ? "low"
                    : "ok";

                return (
                  <div
                    key={product.id}
                    className="rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* Product header */}
                    <div className="flex items-start justify-between px-6 pt-5 pb-4">
                      <div>
                        <h2 className="text-[15px] font-semibold text-gray-900">
                          {product.name}
                        </h2>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {product.description}
                        </p>
                      </div>
                      {overallStatus === "out" && (
                        <span className="ml-4 shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-200">
                          Out of stock
                        </span>
                      )}
                      {overallStatus === "low" && (
                        <span className="ml-4 shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                          Low stock
                        </span>
                      )}
                      {overallStatus === "ok" && (
                        <span className="ml-4 shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                          In stock
                        </span>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="mx-6 border-t border-gray-50" />

                    {/* Warehouse rows */}
                    <div className="px-4 py-3 space-y-1">
                      {product.stock.map((s) => (
                        <div
                          key={s.warehouseId}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50"
                        >
                          <div className="min-w-0 flex-1 pr-4">
                            <div className="flex items-center gap-2">
                              <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15l.75 18H3.75L4.5 3zM8.25 21V10.5m7.5 10.5V10.5M3.75 10.5h16.5" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">
                                {s.warehouseName}
                              </span>
                              {s.warehouseLocation && (
                                <span className="text-xs text-gray-400">
                                  · {s.warehouseLocation}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 pl-5">
                              <StockBadge available={s.available} />
                              <StockBar available={s.available} total={s.available + 20} />
                            </div>
                          </div>

                          <button
                            onClick={() => reserve(product.id, s.warehouseId)}
                            disabled={
                              s.available === 0 ||
                              reserving === `${product.id}-${s.warehouseId}`
                            }
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {reserving === `${product.id}-${s.warehouseId}` ? (
                              <>
                                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Reserving…
                              </>
                            ) : (
                              <>
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                                Reserve
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
        </div>

        {!loading && products.length === 0 && (
          <div className="mt-24 text-center">
            <p className="text-sm text-gray-400">No products found.</p>
          </div>
        )}
      </main>
    </div>
  );
}