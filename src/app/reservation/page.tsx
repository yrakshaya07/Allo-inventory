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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500 text-lg">Loading products...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Allo Inventory</h1>
          <p className="text-gray-500 mt-1">Reserve products before they run out</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        <div className="grid gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800">{product.name}</h2>
              <p className="text-gray-500 mt-1 mb-4">{product.description}</p>
              <div className="grid gap-3">
                {product.stock.map((s) => (
                  <div key={s.warehouseId} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-700">{s.warehouseName}</p>
                      <p className="text-sm mt-0.5">
                        {s.available > 0
                          ? <span className="text-green-600">{s.available} units available</span>
                          : <span className="text-red-500">Out of stock</span>
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => reserve(product.id, s.warehouseId)}
                      disabled={s.available === 0 || reserving === `${product.id}-${s.warehouseId}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {reserving === `${product.id}-${s.warehouseId}` ? "Reserving..." : "Reserve"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}