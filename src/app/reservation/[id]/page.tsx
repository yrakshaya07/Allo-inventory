"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

type Reservation = {
  id: string;
  status: string;
  expiresAt: string;
  quantity: number;
  product: { name: string };
  warehouse: { name: string; location: string };
};

export default function ReservationPage() {
  const params = useParams();
  const id = params.id as string;
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  const fetchReservation = useCallback(async () => {
    const res = await fetch(`/api/reservations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setReservation(data);
      const secondsLeft = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(secondsLeft);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchReservation(); }, [fetchReservation]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  async function confirm() {
    setActionLoading(true);
    setError(null);
    const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to confirm");
      setActionLoading(false);
      return;
    }
    setReservation(data);
    setActionLoading(false);
  }

  async function release() {
    setActionLoading(true);
    setError(null);
    const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to cancel");
      setActionLoading(false);
      return;
    }
    setReservation(data);
    setActionLoading(false);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Loading reservation...</p>
    </div>
  );

  if (!reservation) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-red-500">Reservation not found</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full">
        <button onClick={() => router.push("/")} className="text-blue-600 text-sm mb-6 hover:underline">
          ← Back to products
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reservation Details</h1>
        <p className="text-gray-400 text-xs mb-6">ID: {reservation.id}</p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
          <p><span className="text-gray-500">Product:</span> <span className="font-medium">{reservation.product.name}</span></p>
          <p><span className="text-gray-500">Warehouse:</span> <span className="font-medium">{reservation.warehouse.name}</span></p>
          <p><span className="text-gray-500">Quantity:</span> <span className="font-medium">{reservation.quantity}</span></p>
          <p>
            <span className="text-gray-500">Status:</span>{" "}
            <span className={`font-semibold ${
              reservation.status === "confirmed" ? "text-green-600" :
              reservation.status === "released" ? "text-red-500" : "text-yellow-600"
            }`}>
              {reservation.status.toUpperCase()}
            </span>
          </p>
        </div>

        {reservation.status === "pending" && (
          <>
            <div className={`text-center py-4 rounded-lg mb-6 ${timeLeft < 60 ? "bg-red-50" : "bg-blue-50"}`}>
              <p className="text-sm text-gray-500 mb-1">Time remaining</p>
              <p className={`text-4xl font-mono font-bold ${timeLeft < 60 ? "text-red-600" : "text-blue-600"}`}>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </p>
              {timeLeft === 0 && <p className="text-red-500 text-sm mt-2">Reservation expired!</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                ⚠️ {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={confirm}
                disabled={actionLoading || timeLeft === 0}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Processing..." : "✓ Confirm Purchase"}
              </button>
              <button
                onClick={release}
                disabled={actionLoading}
                className="flex-1 bg-red-100 text-red-700 py-3 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
              >
                ✕ Cancel
              </button>
            </div>
          </>
        )}

        {reservation.status === "confirmed" && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-4 rounded-lg text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-semibold">Purchase Confirmed!</p>
            <p className="text-sm mt-1">Your order has been placed successfully.</p>
          </div>
        )}

        {reservation.status === "released" && (
          <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-4 rounded-lg text-center">
            <p className="font-semibold">Reservation Cancelled</p>
            <p className="text-sm mt-1">Stock has been released back.</p>
            <button onClick={() => router.push("/")} className="mt-3 text-blue-600 text-sm hover:underline">
              Browse products again →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}